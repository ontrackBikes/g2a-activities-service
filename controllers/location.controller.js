const { Location } = require("../models");

const createLocation = async (req, res) => {
  try {
    const location = await Location.create(req.body);

    return res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocations = async (req, res) => {
  try {
    const where = {};

    if (req.query.type) {
      where.type = req.query.type;
    }

    if (req.query.active !== undefined) {
      where.active = req.query.active === "true";
    }

    if (req.query.parentLocationId) {
      where.parent_location_id = req.query.parentLocationId;
    }

    const locations = await Location.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"]
        ]
    });

    return res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationById = async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocationById,
};
