const ANDAMAN_NICOBAR_REGEX = /andaman|nicobar/i;
const JETTY_NAME_REGEX = /jetty/i;

/**
 * Roughly centered on Port Blair; radius below covers the
 * whole archipelago (Andaman & Nicobar Islands).
 */
const ANDAMAN_NICOBAR_LOCATION = "11.7401,92.6586";
const ANDAMAN_NICOBAR_RADIUS_METERS = "250000";

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
 * Nicobar Islands, then regex-filtered to only keep results
 * whose description actually mentions Andaman or Nicobar.
 */
const searchLocations = async ({ query }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "GOOGLE_MAPS_API_KEY is not configured.",
    };
  }

  const cacheKey = query.trim().toLowerCase();
  const cached = searchCache.get(cacheKey);

  if (cached) {
    return {
      success: true,
      data: cached,
    };
  }

  const params = new URLSearchParams({
    query,
    key: apiKey,
    region: "in",
    location: ANDAMAN_NICOBAR_LOCATION,
    radius: ANDAMAN_NICOBAR_RADIUS_METERS,
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

      return {
        place_id: place.place_id,
        name: place.name || "",
        description: place.formatted_address || "",
        lat: place.geometry?.location?.lat ?? null,
        lng: place.geometry?.location?.lng ?? null,
        types,
      };
    })
    .filter((result) => ANDAMAN_NICOBAR_REGEX.test(result.description));

  searchCache.set(cacheKey, results);

  return {
    success: true,
    data: results,
  };
};

const round6 = (value) => Math.round(value * 1e6) / 1e6;

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
};
