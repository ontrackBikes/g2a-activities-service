const {
  searchLocations,
  calculateDistance,
} = require("../services/googleMaps.service");
const { Location, Area } = require("../models");

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

const parseCoordinate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const searchGoogleLocations = async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query param 'q' is required.",
      });
    }

    if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Query param 'q' must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`,
      });
    }

    const locationSlug =
      typeof req.query.location_slug === "string"
        ? req.query.location_slug.trim().toLowerCase()
        : "";

    const areaSlug =
      typeof req.query.area_slug === "string"
        ? req.query.area_slug.trim().toLowerCase()
        : "";

    let area = null;

    // location_slug (a single zone) takes precedence over area_slug
    // (the broader region it sits in) when both are given.
    if (locationSlug) {
      const location = await Location.findOne({
        attributes: ["slug", "latitude", "longitude", "service_area"],
        where: {
          slug: locationSlug,
          active: true,
        },
      });

      if (!location) {
        return res.status(404).json({
          success: false,
          message: "Location not found.",
        });
      }

      area = {
        slug: location.slug,
        lat: location.latitude != null ? Number(location.latitude) : null,
        lng: location.longitude != null ? Number(location.longitude) : null,
        polygon: Array.isArray(location.service_area)
          ? location.service_area
          : null,
      };
    } else if (areaSlug) {
      const areaRow = await Area.findOne({
        attributes: ["slug", "latitude", "longitude", "service_area"],
        where: {
          slug: areaSlug,
          active: true,
        },
      });

      if (!areaRow) {
        return res.status(404).json({
          success: false,
          message: "Area not found.",
        });
      }

      area = {
        slug: areaRow.slug,
        lat: areaRow.latitude != null ? Number(areaRow.latitude) : null,
        lng: areaRow.longitude != null ? Number(areaRow.longitude) : null,
        polygon: Array.isArray(areaRow.service_area)
          ? areaRow.service_area
          : null,
      };
    }

    const result = await searchLocations({ query, area });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[searchGoogleLocations]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search locations.",
    });
  }
};

const getDistanceBetweenLocations = async (req, res) => {
  try {
    const originLat = parseCoordinate(req.query.origin_lat);
    const originLng = parseCoordinate(req.query.origin_lng);
    const destinationLat = parseCoordinate(req.query.destination_lat);
    const destinationLng = parseCoordinate(req.query.destination_lng);

    if (
      originLat === null ||
      originLng === null ||
      destinationLat === null ||
      destinationLng === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "origin_lat, origin_lng, destination_lat and destination_lng are all required and must be numbers.",
      });
    }

    if (
      Math.abs(originLat) > 90 ||
      Math.abs(destinationLat) > 90 ||
      Math.abs(originLng) > 180 ||
      Math.abs(destinationLng) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Coordinates are out of range.",
      });
    }

    const result = await calculateDistance({
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[getDistanceBetweenLocations]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to calculate distance.",
    });
  }
};

module.exports = {
  searchGoogleLocations,
  getDistanceBetweenLocations,
};
