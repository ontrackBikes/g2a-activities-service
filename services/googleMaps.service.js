const ANDAMAN_NICOBAR_REGEX = /andaman|nicobar/i;

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

/**
 * Short-lived cache so repeated/bot-spammed identical queries
 * don't burn Google API quota on every keystroke replay.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map();

const getCached = (key) => {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
};

const setCached = (key, value) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

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
  const cached = getCached(cacheKey);

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
    .map((place) => ({
      place_id: place.place_id,
      name: place.name || "",
      description: place.formatted_address || "",
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
    }))
    .filter((result) => ANDAMAN_NICOBAR_REGEX.test(result.description));

  setCached(cacheKey, results);

  return {
    success: true,
    data: results,
  };
};

module.exports = {
  searchLocations,
};
