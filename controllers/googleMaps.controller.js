const { searchLocations } = require("../services/googleMaps.service");

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

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

module.exports = {
  searchGoogleLocations,
};
