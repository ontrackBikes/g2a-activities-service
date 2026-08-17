const EARTH_RADIUS_METERS = 6371000;

const toRadians = (deg) => (deg * Math.PI) / 180;

const haversineDistanceMeters = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

/**
 * Ray-casting (PNPOLY) point-in-polygon test.
 * `polygon` is an array of { lat, lng } vertices (need not be closed).
 */
const isPointInPolygon = (point, polygon) => {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Smallest-enclosing-circle approximation (centroid + farthest vertex).
 * Used only to bias the Google Places API call toward the polygon's
 * general area -- isPointInPolygon() above is the real boundary check.
 */
const getPolygonBoundingCircle = (polygon) => {
  const centroid = polygon.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat / polygon.length,
      lng: acc.lng + point.lng / polygon.length,
    }),
    { lat: 0, lng: 0 },
  );

  const radiusMeters = Math.max(
    ...polygon.map((point) => haversineDistanceMeters(centroid, point)),
  );

  return { center: centroid, radiusMeters };
};

/**
 * Converts our stored polygon (array of {lat,lng}) into a GeoJSON
 * Polygon geometry, closing the ring as GeoJSON requires.
 */
const polygonToGeoJson = (polygon) => {
  const ring = polygon.map((point) => [point.lng, point.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  return {
    type: "Polygon",
    coordinates: [ring],
  };
};

/**
 * Parses a GeoJSON Polygon / Feature<Polygon> / FeatureCollection
 * (containing one Polygon feature) into our stored polygon format
 * (array of {lat,lng}, closing duplicate dropped). Throws a
 * human-readable error on anything malformed.
 */
const geoJsonToPolygon = (geojson) => {
  let geometry = geojson;

  if (geometry?.type === "FeatureCollection") {
    geometry = (geometry.features || []).find(
      (feature) => feature.geometry?.type === "Polygon",
    )?.geometry;
  } else if (geometry?.type === "Feature") {
    geometry = geometry.geometry;
  }

  if (geometry?.type !== "Polygon") {
    throw new Error(
      "geojson must be a Polygon, a Feature<Polygon>, or a FeatureCollection containing one Polygon feature.",
    );
  }

  const ring = geometry.coordinates?.[0];

  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error(
      "Polygon outer ring must have at least 4 positions (3 unique vertices, closed).",
    );
  }

  const vertices = ring.map((position) => {
    const [lng, lat] = position;

    if (typeof lng !== "number" || typeof lat !== "number") {
      throw new Error("Each coordinate must be a [lng, lat] number pair.");
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error("Coordinates out of range.");
    }

    return { lat, lng };
  });

  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  const deduped =
    first.lat === last.lat && first.lng === last.lng
      ? vertices.slice(0, -1)
      : vertices;

  if (deduped.length < 3) {
    throw new Error("Polygon must have at least 3 unique vertices.");
  }

  return deduped;
};

/**
 * Lets a create/update payload set the boundary inline via a `geojson`
 * field, instead of only through the dedicated /service-area endpoint.
 * `geojson: null` clears the boundary; omitting the field leaves
 * `service_area` untouched. Throws (via geoJsonToPolygon) on malformed
 * GeoJSON -- callers should catch and turn that into a 400.
 */
const extractServiceAreaField = (value) => {
  if (!("geojson" in value)) {
    return value;
  }

  const { geojson, ...rest } = value;

  return {
    ...rest,
    service_area: geojson === null ? null : geoJsonToPolygon(geojson),
  };
};

module.exports = {
  haversineDistanceMeters,
  isPointInPolygon,
  getPolygonBoundingCircle,
  polygonToGeoJson,
  geoJsonToPolygon,
  extractServiceAreaField,
};
