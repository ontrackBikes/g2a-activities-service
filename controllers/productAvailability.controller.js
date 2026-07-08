const moment = require("moment-timezone");

const {
  Product,
  ProductType,
  Location,
  Category,
  BookingTemplate,
} = require("../models");
const {
  checkSingleDateAvailabilitySchema,
  checkDateRangeAvailabilitySchema,
  availableDatesQuerySchema,
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
const {
  checkSingleDate,
} = require("../services/availability/singleDate.service.js");
const {
  AvailableDatesError,
  getAvailableDates,
} = require("../services/availability/availableDates.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const checkProductAvailability = async (req, res) => {
  try {
    const { slug } = req.params;

    // Default travel date
    const payload = {
      ...req.body,
      date: req.body.date || moment().format("YYYY-MM-DD"),
    };

    // Parse "<product>-in-<location>"
    const match = slug.match(/^(.*)-in-(.*)$/);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid product URL.",
      });
    }

    const [, productSlug, locationSlug] = match;

    payload.location_slug = locationSlug;

    /**
     * Product
     */
    const product = await Product.findOne({
      attributes: [
        "id",
        "slug",
        "name",
        "booking_mode",
        "thumbnail_url",
      ],

      where: {
        slug: productSlug,
        active: true,
      },

      include: [
        {
          model: BookingTemplate,
          as: "bookingTemplate",
          attributes: {
            exclude: ["id"],
            include: ["product_page_schema"],
          },
        },
        {
          model: ProductType,
          as: "productType",
          attributes: ["slug"],
          required: true,
          where: { active: true },
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
        message: "Product not found.",
      });
    }

    /**
     * Validate request
     */
    const schemaMap = {
      single_date: checkSingleDateAvailabilitySchema,
      date_range: checkDateRangeAvailabilitySchema,
    };

    const schema = schemaMap[product.booking_mode];

    if (!schema) {
      return res.status(400).json({
        success: false,
        message: `Unsupported booking mode '${product.booking_mode}'.`,
      });
    }

    const { error, value } = schema.validate(payload, {
      abortEarly: true,
      stripUnknown: true,
    });

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
      attributes: ["id", "slug", "name"],
      where: {
        slug: value.location_slug,
        active: true,
      },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    /**
     * Booking Mode Dispatcher
     */
    const handlers = {
      single_date: checkSingleDate,
      date_range: checkDateRange,
    };

    const handler = handlers[product.booking_mode];

    const result = await handler({
      product,
      location,
      payload: value,
      estimateId: value.estimate_id,
    });

    return res.status(result.status || 200).json({
      ...result,
      bookingTemplate: product.bookingTemplate,
      selectedLocation: location,
    });
  } catch (error) {
    console.error(
      "[ProductAvailabilityController] checkProductAvailability",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check product availability.",
    });
  }
};

const getProductAvailableDates = async (req, res) => {
  try {
    const { error, value } =
      availableDatesQuerySchema.validate(
        req.query,
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

    const result = await getAvailableDates({
      productSlug: req.params.slug,
      locationSlug: value.location_slug || null,
      fromDate: value.from_date || null,
      toDate: value.to_date || null,
      guests: value.guests,
    });

    const product = result.product;

    return res.status(200).json({
      success: true,
      from_date: result.from_date,
      to_date: result.to_date,
      guests: result.guests,
      product: {
        slug: product.slug,
        name: product.name,
        booking_mode: product.booking_mode,
        product_type: product.product_type,
        category: product.category,
      },
      locations: product.locations,
    });
  } catch (error) {
    if (error instanceof AvailableDatesError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    console.error(
      "[ProductAvailabilityController] getProductAvailableDates",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch product available dates",
    });
  }
};

module.exports = {
  checkProductAvailability,
  getProductAvailableDates,
};
