const {
  searchLocations,
  calculateDistance,
} = require("../services/googleMaps.service");

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

    const result = await searchLocations({ query });

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
