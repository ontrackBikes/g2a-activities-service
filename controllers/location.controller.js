const { Sequelize, Op } = require("sequelize");
const sequelize = require("../config/sequelize");
const BookingEstimate = require("../models/bookingEstimate.model");
const {
  Location,
  Area,
  VendorProduct,
  VendorProductImage,
  VendorProductFaq,
  VendorProductTerm,
  VendorProductHighlight,
  VendorProductInclusion,
  VendorProductExclusion,
  VendorProductThingToKnow,
  VendorProductSlot,
  VendorSchedule,
  VendorScheduleSlot,
  OrderItem,
} = require("../models");

const {
  createLocationSchema,
  updateLocationSchema,
  serviceAreaSchema,
} = require("../schemas/location.schema");
const {
  geoJsonToPolygon,
  polygonToGeoJson,
  extractServiceAreaField,
} = require("../utils/geoBoundary");

const authorizePermanentDelete = (req, res) => {
  const token = process.env.PERMANENT_DELETE_TOKEN;
  const authorization = req.get("authorization");

  if (!token) {
    console.error("[LocationController] PERMANENT_DELETE_TOKEN is not configured");

    res.status(500).json({
      success: false,
      message: "Permanent delete is not configured",
    });

    return false;
  }

  if (authorization !== `Bearer ${token}`) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });

    return false;
  }

  return true;
};

const createLocation = async (req, res) => {
  try {
    const { error, value } = createLocationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (value.parent_location_id) {
      const parentLocation = await Location.findByPk(value.parent_location_id);

      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: "Parent location not found",
        });
      }
    }

    if (value.area_id) {
      const area = await Area.findByPk(value.area_id);

      if (!area) {
        return res.status(404).json({
          success: false,
          message: "Area not found",
        });
      }
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

    const location = await Location.create(payload);

    return res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error) {
    console.error("[LocationController] createLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocations = async (req, res) => {
  try {
    const { active, location_type, parent_location_id, area_id } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (location_type) {
      where.location_type = location_type;
    }

    if (parent_location_id) {
      where.parent_location_id = parent_location_id;
    }

    if (area_id) {
      where.area_id = area_id;
    }

    const locations = await Location.findAll({
      where,
      include: [
        {
          model: Area,
          as: "area",
          attributes: ["id", "name", "slug"],
        },
      ],
      order: [["name", "ASC"]],
    });

    const locationIds = locations.map((location) => location.id);

    let countMap = {};

    if (locationIds.length) {
      const productCounts = await VendorProduct.findAll({
        attributes: [
          "location_id",
          [
            Sequelize.fn(
              "COUNT",
              Sequelize.fn("DISTINCT", Sequelize.col("product_id")),
            ),
            "product_count",
          ],
        ],
        where: {
          location_id: locationIds,
          active: true,
        },
        group: ["location_id"],
        raw: true,
      });

      countMap = productCounts.reduce((acc, item) => {
        acc[item.location_id] = Number(item.product_count);
        return acc;
      }, {});
    }

    const data = locations.map((location) => ({
      ...location.toJSON(),
      product_count: countMap[location.id] || 0,
    }));

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("[LocationController] getLocations", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocation = async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id, {
      include: [
        {
          model: Location,
          as: "parent",
        },
        {
          model: Location,
          as: "children",
        },
        {
          model: Area,
          as: "area",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

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
    console.error("[LocationController] getLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationApp = async (req, res) => {
  try {
    let slug = req.params.slug;
    if (!slug)
      return res.status(500).json({
        success: false,
        message: "Please provode slug",
      });
    const location = await Location.findOne(
      { where: { slug: req.params.slug }, attributes: { exclude: ["id"] } },
      {
        include: [
          {
            model: Location,
            as: "parent",
            attributes: { exclude: ["id"] },
          },
          {
            model: Location,
            as: "children",
            attributes: { exclude: ["id"] },
          },
        ],
      },
    );

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
    console.error("[LocationController] getLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationOptions = async (req, res) => {
  try {
    const locations = await Location.findAll({
      where: {
        active: true,
      },
      attributes: ["id", "name", "slug"],
      order: [["name", "ASC"]],
    });

    const options = locations.map((location) => ({
      id: location.id,
      label: location.name,
      slug: location.slug,
    }));

    return res.json({
      success: true,
      count: options.length,
      data: options,
    });
  } catch (error) {
    console.error("[LocationController] getLocationOptions", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getLocationTree = async (req, res) => {
  try {
    const locations = await Location.findAll({
      where: {
        active: true,
      },
      raw: true,
    });

    const map = {};
    const roots = [];

    locations.forEach((location) => {
      map[location.id] = {
        ...location,
        children: [],
      };
    });

    locations.forEach((location) => {
      if (location.parent_location_id) {
        const parent = map[location.parent_location_id];

        if (parent) {
          parent.children.push(map[location.id]);
        }
      } else {
        roots.push(map[location.id]);
      }
    });

    return res.json({
      success: true,
      data: roots,
    });
  } catch (error) {
    console.error("[LocationController] getLocationTree", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { error, value } = updateLocationSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    if (value.parent_location_id) {
      const parentLocation = await Location.findByPk(value.parent_location_id);

      if (!parentLocation) {
        return res.status(404).json({
          success: false,
          message: "Parent location not found",
        });
      }

      if (Number(value.parent_location_id) === Number(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Location cannot be its own parent",
        });
      }
    }

    if (value.area_id) {
      const area = await Area.findByPk(value.area_id);

      if (!area) {
        return res.status(404).json({
          success: false,
          message: "Area not found",
        });
      }
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

    await location.update(payload);

    return res.json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error("[LocationController] updateLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getServiceArea = async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id, {
      attributes: ["id", "slug", "name", "latitude", "longitude", "service_area"],
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const polygon = Array.isArray(location.service_area)
      ? location.service_area
      : null;

    return res.json({
      success: true,
      data: {
        id: location.id,
        slug: location.slug,
        name: location.name,
        center:
          location.latitude != null && location.longitude != null
            ? {
                lat: Number(location.latitude),
                lng: Number(location.longitude),
              }
            : null,
        geojson: polygon ? polygonToGeoJson(polygon) : null,
      },
    });
  } catch (error) {
    console.error("[LocationController] getServiceArea", error);

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

    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
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

    await location.update({ service_area: polygon });

    return res.json({
      success: true,
      message: "Service area updated successfully",
      data: {
        id: location.id,
        slug: location.slug,
        geojson: polygonToGeoJson(polygon),
      },
    });
  } catch (error) {
    console.error("[LocationController] updateServiceArea", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    await location.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    console.error("[LocationController] deleteLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const permanentlyDeleteLocation = async (req, res) => {
  if (!authorizePermanentDelete(req, res)) {
    return;
  }

  try {
    const locationId = Number(req.params.id);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID",
      });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const location = await Location.findByPk(locationId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!location) {
        return null;
      }

      const orderItemCount = await OrderItem.count({
        where: { location_id: location.id },
        transaction,
      });

      if (orderItemCount) {
        return {
          blocked: true,
          reason: "orders",
        };
      }

      const vendorProducts = await VendorProduct.findAll({
        attributes: ["id"],
        where: { location_id: location.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const vendorProductIds = vendorProducts.map(({ id }) => id);

      if (vendorProductIds.length) {
        const schedules = await VendorSchedule.findAll({
          attributes: ["id"],
          where: {
            vendor_product_id: { [Op.in]: vendorProductIds },
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const scheduleIds = schedules.map(({ id }) => id);

        if (scheduleIds.length) {
          const bookedSlotCount = await VendorScheduleSlot.count({
            where: {
              vendor_schedule_id: { [Op.in]: scheduleIds },
              booked: { [Op.gt]: 0 },
            },
            transaction,
          });

          if (bookedSlotCount) {
            return {
              blocked: true,
              reason: "bookings",
            };
          }

          await VendorScheduleSlot.destroy({
            where: {
              vendor_schedule_id: { [Op.in]: scheduleIds },
            },
            transaction,
          });
        }

        await BookingEstimate.destroy({
          where: { location_id: location.id },
          transaction,
        });

        await Promise.all([
          VendorProductImage.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductFaq.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductTerm.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductHighlight.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductInclusion.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductExclusion.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductThingToKnow.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorProductSlot.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
          VendorSchedule.destroy({
            where: { vendor_product_id: { [Op.in]: vendorProductIds } },
            transaction,
          }),
        ]);

        await VendorProduct.destroy({
          where: { id: { [Op.in]: vendorProductIds } },
          transaction,
        });
      } else {
        await BookingEstimate.destroy({
          where: { location_id: location.id },
          transaction,
        });
      }

      await Location.update(
        { parent_location_id: null },
        {
          where: { parent_location_id: location.id },
          transaction,
        },
      );

      await location.destroy({ transaction });

      return { location_id: location.id };
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    if (result.blocked) {
      return res.status(409).json({
        success: false,
        message:
          result.reason === "orders"
            ? "Location cannot be permanently deleted because orders exist"
            : "Location cannot be permanently deleted because booked inventory exists",
      });
    }

    return res.json({
      success: true,
      message: "Location permanently deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("[LocationController] permanentlyDeleteLocation", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocation,
  getLocationOptions,
  getLocationTree,
  updateLocation,
  deleteLocation,
  permanentlyDeleteLocation,
  getLocationApp,
  getServiceArea,
  updateServiceArea,
};
