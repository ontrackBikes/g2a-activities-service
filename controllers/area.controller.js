const { Area } = require("../models");
const {
  createAreaSchema,
  updateAreaSchema,
  serviceAreaSchema,
} = require("../schemas/area.schema");
const {
  geoJsonToPolygon,
  polygonToGeoJson,
  extractServiceAreaField,
} = require("../utils/geoBoundary");

const createArea = async (req, res) => {
  try {
    const { error, value } = createAreaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let payload;

    try {
      payload = extractServiceAreaField(value);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    const area = await Area.create(payload);

    return res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: area,
    });
  } catch (error) {
    console.error("[AreaController] createArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAreas = async (req, res) => {
  try {
    const { active } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    const areas = await Area.findAll({
      where,
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      count: areas.length,
      data: areas,
    });
  } catch (error) {
    console.error("[AreaController] getAreas", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAreaOptions = async (req, res) => {
  try {
    const areas = await Area.findAll({
      where: {
        active: true,
      },
      attributes: ["id", "name", "slug"],
      order: [["name", "ASC"]],
    });

    const options = areas.map((area) => ({
      id: area.id,
      label: area.name,
      slug: area.slug,
    }));

    return res.json({
      success: true,
      count: options.length,
      data: options,
    });
  } catch (error) {
    console.error("[AreaController] getAreaOptions", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getArea = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    return res.json({
      success: true,
      data: area,
    });
  } catch (error) {
    console.error("[AreaController] getArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateArea = async (req, res) => {
  try {
    const { error, value } = updateAreaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    let payload;

    try {
      payload = extractServiceAreaField(value);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    await area.update(payload);

    return res.json({
      success: true,
      message: "Area updated successfully",
      data: area,
    });
  } catch (error) {
    console.error("[AreaController] updateArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteArea = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    await area.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Area deleted successfully",
    });
  } catch (error) {
    console.error("[AreaController] deleteArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getServiceArea = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id, {
      attributes: ["id", "slug", "name", "latitude", "longitude", "service_area"],
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    const polygon = Array.isArray(area.service_area) ? area.service_area : null;

    return res.json({
      success: true,
      data: {
        id: area.id,
        slug: area.slug,
        name: area.name,
        center:
          area.latitude != null && area.longitude != null
            ? {
                lat: Number(area.latitude),
                lng: Number(area.longitude),
              }
            : null,
        geojson: polygon ? polygonToGeoJson(polygon) : null,
      },
    });
  } catch (error) {
    console.error("[AreaController] getServiceArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateServiceArea = async (req, res) => {
  try {
    const { error, value } = serviceAreaSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const area = await Area.findByPk(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    let polygon;

    try {
      polygon = geoJsonToPolygon(value.geojson);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message,
      });
    }

    await area.update({ service_area: polygon });

    return res.json({
      success: true,
      message: "Service area updated successfully",
      data: {
        id: area.id,
        slug: area.slug,
        geojson: polygonToGeoJson(polygon),
      },
    });
  } catch (error) {
    console.error("[AreaController] updateServiceArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createArea,
  getAreas,
  getAreaOptions,
  getArea,
  updateArea,
  deleteArea,
  getServiceArea,
  updateServiceArea,
};
