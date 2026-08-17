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
 * Stored `service_area` has two possible shapes for backward
 * compatibility: the legacy single-polygon shape (a flat array of
 * {lat,lng}), or the current shape (an array of rings, one per
 * polygon part, to support MultiPolygon). This normalizes either
 * shape into the current one.
 */
const normalizePolygonList = (polygon) => {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return [];
  }

  return Array.isArray(polygon[0]) ? polygon : [polygon];
};

/**
 * True if the stored/parsed polygon has at least one ring with
 * enough vertices to be a usable boundary.
 */
const hasUsablePolygon = (polygon) =>
  normalizePolygonList(polygon).some((ring) => ring.length >= 3);

/**
 * Ray-casting (PNPOLY) point-in-polygon test against a single ring.
 * `ring` is an array of { lat, lng } vertices (need not be closed).
 */
const isPointInRing = (point, ring) => {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Point-in-polygon test across every part of a Polygon/MultiPolygon
 * boundary -- true if the point falls inside ANY part.
 */
const isPointInPolygon = (point, polygon) =>
  normalizePolygonList(polygon).some((ring) => isPointInRing(point, ring));

/**
 * Smallest-enclosing-circle approximation (centroid + farthest vertex)
 * across every part of a Polygon/MultiPolygon boundary. Used only to
 * bias the Google Places API call toward the boundary's general area
 * -- isPointInPolygon() above is the real boundary check.
 */
const getPolygonBoundingCircle = (polygon) => {
  const vertices = normalizePolygonList(polygon).flat();

  const centroid = vertices.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat / vertices.length,
      lng: acc.lng + point.lng / vertices.length,
    }),
    { lat: 0, lng: 0 },
  );

  const radiusMeters = Math.max(
    ...vertices.map((point) => haversineDistanceMeters(centroid, point)),
  );

  return { center: centroid, radiusMeters };
};

const ringToGeoJsonRing = (ring) => {
  const coords = ring.map((point) => [point.lng, point.lat]);
  const first = coords[0];
  const last = coords[coords.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push(first);
  }

  return coords;
};

/**
 * Converts our stored polygon (a ring, for the legacy single-polygon
 * shape, or an array of rings) into a GeoJSON Polygon or MultiPolygon
 * geometry, closing each ring as GeoJSON requires. Emits Polygon when
 * there's a single part (the common case), MultiPolygon otherwise.
 */
const polygonToGeoJson = (polygon) => {
  const rings = normalizePolygonList(polygon);

  if (rings.length <= 1) {
    return {
      type: "Polygon",
      coordinates: [ringToGeoJsonRing(rings[0] || [])],
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: rings.map((ring) => [ringToGeoJsonRing(ring)]),
  };
};

/**
 * Parses one GeoJSON Polygon outer ring (coordinates[0] of a Polygon,
 * or coordinates[n][0] of a MultiPolygon part) into our stored ring
 * format (array of {lat,lng}, closing duplicate dropped). Interior
 * holes aren't supported -- only the outer ring is kept. Throws a
 * human-readable error on anything malformed.
 */
const parseRing = (ringCoordinates) => {
  if (!Array.isArray(ringCoordinates) || ringCoordinates.length < 4) {
    throw new Error(
      "Polygon outer ring must have at least 4 positions (3 unique vertices, closed).",
    );
  }

  const vertices = ringCoordinates.map((position) => {
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
 * Parses a GeoJSON Polygon / MultiPolygon / Feature<Polygon|MultiPolygon>
 * / FeatureCollection (containing one such feature) into our stored
 * polygon format: an array of rings (one ring for a Polygon, one per
 * part for a MultiPolygon). Throws a human-readable error on anything
 * malformed.
 */
const geoJsonToPolygon = (geojson) => {
  let geometry = geojson;

  if (geometry?.type === "FeatureCollection") {
    geometry = (geometry.features || []).find((feature) =>
      ["Polygon", "MultiPolygon"].includes(feature.geometry?.type),
    )?.geometry;
  } else if (geometry?.type === "Feature") {
    geometry = geometry.geometry;
  }

  if (geometry?.type === "Polygon") {
    return [parseRing(geometry.coordinates?.[0])];
  }

  if (geometry?.type === "MultiPolygon") {
    const parts = geometry.coordinates;

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("MultiPolygon must contain at least one polygon.");
    }

    return parts.map((part) => parseRing(part?.[0]));
  }

  throw new Error(
    "geojson must be a Polygon, a MultiPolygon, a Feature<Polygon|MultiPolygon>, or a FeatureCollection containing one such feature.",
  );
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
  normalizePolygonList,
  hasUsablePolygon,
  isPointInPolygon,
  getPolygonBoundingCircle,
  polygonToGeoJson,
  geoJsonToPolygon,
  extractServiceAreaField,
};
