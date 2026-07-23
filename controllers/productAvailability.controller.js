const moment = require("moment-timezone");

const {
  Product,
  ProductType,
  Location,
  Category,
  BookingTemplate,
  ProductTerm,
  ProductCancellationPolicy,
  ProductInclusion,
  ProductHighlight,
  ProductExclusion,
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
      pickup_date: req.body.pickup_date || moment().format("YYYY-MM-DD"),
      return_date:
        req.body.return_date ||
        moment(req.body.pickup_date).add(1, "d").format("YYYY-MM-DD"),
      pickup_time: req.body.pickup_time || "10:00",
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
        "pricing_mode",
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
        {
          model: ProductTerm,
          as: "terms",
        },
        {
          model: ProductCancellationPolicy,
          as: "cancellationPolicies",
          required: false,
          separate: true,
          where: { active: true },
          attributes: ["title", "content", "sort_order"],
          order: [
            ["sort_order", "ASC"],
            ["id", "ASC"],
          ],
        },
        {
          model: ProductInclusion,
          as: "inclusions",
        },
        {
          model: ProductHighlight,
          as: "highlights",
        },
        {
          model: ProductExclusion,
          as: "exclusions",
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

    const pricingField =
      product.pricing_mode === "quantity"
        ? "quantity"
        : "guests";

    if (!value[pricingField]) {
      return res.status(400).json({
        success: false,
        message: `"${pricingField}" is required for this product.`,
      });
    }

    const availabilityPayload = {
      ...value,
      pricing_quantity: value[pricingField],
    };

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
      payload: availabilityPayload,
      estimateId: availabilityPayload.estimate_id,
    });

    return res.status(result.status || 200).json({
      ...result,
      selected_location: {
        slug: location.slug,
        name: location.name,
      },
    });
  } catch (error) {
    if (error instanceof DateRangeAvailabilityError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

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
      quantity: value.quantity,
    });

    const product = result.product;

    return res.status(200).json({
      success: true,
      from_date: result.from_date,
      to_date: result.to_date,
      guests: result.guests,
      pricing_quantity: result.pricing_quantity,
      product: {
        slug: product.slug,
        name: product.name,
        booking_mode: product.booking_mode,
        pricing_mode: product.pricing_mode,
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
