const moment = require("moment-timezone");

const { Product, ProductType, Location, Category } = require("../models");
const {
  checkSingleDateAvailabilitySchema,
  checkDateRangeAvailabilitySchema,
} = require("../schemas/productAvailability.schema");
const {
  getAvailableVendorForProduct,
} = require("../services/availableVendor.service");
const {
  DateRangeAvailabilityError,
  getAvailableDateRangeVendor,
} = require("../services/availability/availableVendorDateRange.service.js");
const {
  checkDateRange,
} = require("../services/availability/dateRange.service.js");
const { checkSingleDate } = require("../services/availability/singleDate.service.js");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";


const checkProductAvailability = async (req, res) => {
  try {
    /**
     * Product
     */
    const product = await Product.findOne({
      attributes: [
        "id",
        "slug",
        "name",
        "booking_mode",
      ],

      where: {
        slug: req.params.slug,
        active: true,
      },

      include: [
        {
          model: ProductType,
          as: "productType",

          attributes: ["slug"],

          required: true,

          where: {
            active: true,
          },

          include: [
            {
              model: Category,
              as: "category",
            },
          ],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /**
     * Validation
     */

    const validationSchemas = {
      single_date: checkSingleDateAvailabilitySchema,
      date_range: checkDateRangeAvailabilitySchema,
    };

    const schema =
      validationSchemas[product.booking_mode];

    if (!schema) {
      return res.status(400).json({
        success: false,
        message: `Unsupported booking mode '${product.booking_mode}'`,
      });
    }

    const { error, value } = schema.validate(
      req.body,
      {
        abortEarly: true,
        stripUnknown: true,
      },
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    /**
     * Location
     */

    const location = await Location.findOne({
      attributes: [
        "id",
        "slug",
        "name",
      ],

      where: {
        slug: value.location_slug,
        active: true,
      },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    /**
     * Dispatch
     */

    let result;

    switch (product.booking_mode) {
      case "single_date":
        result = await checkSingleDate({
          product,
          location,
          payload: value,
        });
        break;

      case "date_range":
        result = await checkDateRange({
          product,
          location,
          payload: value,
        });
        break;

      case "open":
        return res.status(501).json({
          success: false,
          message:
            "Open booking not implemented yet.",
        });

      default:
        return res.status(400).json({
          success: false,
          message:
            "Unsupported booking mode.",
        });
    }

    /**
     * Send service response
     */

    return res
      .status(result.status || 200)
      .json(result);

  } catch (error) {
    console.error(
      "[ProductAvailabilityController] checkProductAvailability",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to check product availability",
    });
  }
};

module.exports = {
  checkProductAvailability,
};
