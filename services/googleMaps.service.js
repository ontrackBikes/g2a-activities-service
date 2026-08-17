const crypto = require("crypto");
const {
  isPointInPolygon,
  getPolygonBoundingCircle,
} = require("../utils/geoBoundary");

const ANDAMAN_NICOBAR_REGEX = /andaman|nicobar/i;
const JETTY_NAME_REGEX = /jetty/i;

/**
 * Roughly centered on Port Blair; radius below covers the
 * whole archipelago (Andaman & Nicobar Islands).
 */
const ANDAMAN_NICOBAR_LOCATION = "11.7401,92.6586";
const ANDAMAN_NICOBAR_RADIUS_METERS = "250000";

/**
 * Bias radius used when a location_slug is given but that Location
 * has no service_area polygon defined yet -- tighter than the
 * archipelago-wide default, but not a hard boundary.
 */
const DEFAULT_LOCATION_RADIUS_METERS = "15000";

/**
 * Secret used to sign the coordinates returned by searchLocations(),
 * so a "custom" pickup/drop location submitted later can be proven
 * to be a real, unmodified Google Places result rather than a
 * client-fabricated lat/lng (which would otherwise feed straight
 * into KM_BASED distance pricing unverified).
 */
const PLACE_SIGNATURE_SECRET =
  process.env.PLACE_COORDINATE_SIGNATURE_SECRET ||
  process.env.GOOGLE_MAPS_API_KEY;

const round6 = (value) => Math.round(value * 1e6) / 1e6;

const signCoordinates = (lat, lng) =>
  crypto
    .createHmac("sha256", PLACE_SIGNATURE_SECRET)
    .update(`${round6(lat)},${round6(lng)}`)
    .digest("hex");

/**
 * Verifies a lat/lng pair was actually issued by signCoordinates()
 * above (i.e. came from a real searchLocations() result) rather
 * than being fabricated by the client.
 */
const verifyCoordinateSignature = (lat, lng, signature) => {
  if (!signature || lat == null || lng == null) {
    return false;
  }

  const expected = Buffer.from(signCoordinates(lat, lng), "hex");
  const provided = Buffer.from(String(signature).toLowerCase(), "hex");

  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  );
};

/**
 * Text Search (not Autocomplete) is used because it returns
 * geometry.location (lat/lng) for every result in one call —
 * Autocomplete predictions never include coordinates, and
 * fetching Place Details per-suggestion would multiply cost.
 */
const TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

const DISTANCE_MATRIX_URL =
  "https://maps.googleapis.com/maps/api/distancematrix/json";

/**
 * Short-lived cache so repeated/bot-spammed identical requests
 * don't burn Google API quota replaying the same lookup.
 */
const createCache = ({ ttlMs, maxEntries }) => {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);

      if (!entry) {
        return undefined;
      }

      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }

      return entry.value;
    },

    set(key, value) {
      if (store.size >= maxEntries) {
        store.delete(store.keys().next().value);
      }

      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
  };
};

const searchCache = createCache({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 500,
});

/**
 * Road distance between two fixed coordinates doesn't change,
 * so this can be cached far longer than a text search.
 */
const distanceCache = createCache({
  ttlMs: 24 * 60 * 60 * 1000,
  maxEntries: 1000,
});

/**
 * Search Google Places for a query, biased to Andaman &
 * Nicobar Islands (or to a single Location's area when `area` is
 * given), then filtered to only keep results that actually fall
 * within that boundary.
 *
 * `area` (optional): { slug, lat, lng, polygon }, resolved from a
 * Location row by the caller.
 *   - polygon given: bias the Google call to the polygon's bounding
 *     circle, then hard-filter results with a point-in-polygon test
 *     -- this is the real boundary.
 *   - polygon absent but lat/lng given: bias to that point with a
 *     fixed default radius (no hard geofence yet -- the Location has
 *     no service_area defined).
 *   - no area: unchanged archipelago-wide behavior.
 */
const searchLocations = async ({ query, area = null }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "GOOGLE_MAPS_API_KEY is not configured.",
    };
  }

  const cacheKey = `${query.trim().toLowerCase()}|${area?.slug || ""}`;
  const cached = searchCache.get(cacheKey);

  if (cached) {
    return {
      success: true,
      data: cached,
    };
  }

  let biasLocation = ANDAMAN_NICOBAR_LOCATION;
  let biasRadius = ANDAMAN_NICOBAR_RADIUS_METERS;

  if (area?.polygon?.length >= 3) {
    const boundingCircle = getPolygonBoundingCircle(area.polygon);

    biasLocation = `${boundingCircle.center.lat},${boundingCircle.center.lng}`;
    biasRadius = String(Math.ceil(boundingCircle.radiusMeters));
  } else if (area?.lat != null && area?.lng != null) {
    biasLocation = `${area.lat},${area.lng}`;
    biasRadius = DEFAULT_LOCATION_RADIUS_METERS;
  }

  const params = new URLSearchParams({
    query,
    key: apiKey,
    region: "in",
    location: biasLocation,
    radius: biasRadius,
  });

  let data;

  try {
    const response = await fetch(`${TEXT_SEARCH_URL}?${params.toString()}`);
    data = await response.json();
  } catch (error) {
    console.error("[GoogleMaps] Request failed", error);

    return {
      success: false,
      message: "Unable to reach Google Places API.",
    };
  }

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[GoogleMaps] API error", data.status, data.error_message);

    return {
      success: false,
      message: data.error_message || `Google Places API error: ${data.status}`,
    };
  }

  const places = data.results || [];

  const results = places
    .map((place) => {
      const types = place.types || [];

      if (JETTY_NAME_REGEX.test(place.name || "") && !types.includes("jetty")) {
        types.push("jetty");
      }

      const lat = place.geometry?.location?.lat ?? null;
      const lng = place.geometry?.location?.lng ?? null;

      return {
        place_id: place.place_id,
        name: place.name || "",
        description: place.formatted_address || "",
        lat,
        lng,
        place_types: types,
        signature: lat != null && lng != null ? signCoordinates(lat, lng) : null,
      };
    })
    .filter((result) => ANDAMAN_NICOBAR_REGEX.test(result.description))
    .filter((result) => {
      if (!(area?.polygon?.length >= 3)) {
        return true;
      }

      if (result.lat == null || result.lng == null) {
        return false;
      }

      return isPointInPolygon(
        { lat: result.lat, lng: result.lng },
        area.polygon,
      );
    });

  searchCache.set(cacheKey, results);

  return {
    success: true,
    data: results,
  };
};

/**
 * Real road distance/duration between two coordinates via
 * Google's Distance Matrix API (no traffic model — a single
 * fixed departure-time-independent estimate).
 */
const calculateDistance = async ({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
}) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "GOOGLE_MAPS_API_KEY is not configured.",
    };
  }

  const cacheKey = [
    round6(originLat),
    round6(originLng),
    round6(destinationLat),
    round6(destinationLng),
  ].join(",");

  const cached = distanceCache.get(cacheKey);

  if (cached) {
    return {
      success: true,
      data: cached,
    };
  }

  const params = new URLSearchParams({
    origins: `${originLat},${originLng}`,
    destinations: `${destinationLat},${destinationLng}`,
    units: "metric",
    key: apiKey,
  });

  let data;

  try {
    const response = await fetch(`${DISTANCE_MATRIX_URL}?${params.toString()}`);
    data = await response.json();
  } catch (error) {
    console.error("[GoogleMaps] Distance request failed", error);

    return {
      success: false,
      message: "Unable to reach Google Distance Matrix API.",
    };
  }

  if (data.status !== "OK") {
    console.error("[GoogleMaps] Distance API error", data.status, data.error_message);

    return {
      success: false,
      message: data.error_message || `Google Distance Matrix API error: ${data.status}`,
    };
  }

  const element = data.rows?.[0]?.elements?.[0];

  if (!element || element.status !== "OK") {
    return {
      success: false,
      message:
        element?.status === "ZERO_RESULTS"
          ? "No route found between the given coordinates."
          : `Google Distance Matrix API error: ${element?.status || "UNKNOWN"}`,
    };
  }

  const result = {
    distance_km: Math.round((element.distance.value / 1000) * 100) / 100,
    distance_text: element.distance.text,
    duration_minutes: Math.round(element.duration.value / 60),
    duration_text: element.duration.text,
  };

  distanceCache.set(cacheKey, result);

  return {
    success: true,
    data: result,
  };
};

module.exports = {
  searchLocations,
  calculateDistance,
  verifyCoordinateSignature,
};
