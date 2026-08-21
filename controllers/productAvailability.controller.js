const moment = require("moment-timezone");

const {
  Product,
  ProductType,
  Location,
  Category,
  BookingTemplate,
  ProductTerm,
  ProductFaq,
  ProductCancellationPolicy,
  ProductInclusion,
  ProductHighlight,
  ProductExclusion,
} = require("../models");
const {
  checkSingleDateAvailabilitySchema,
  checkDateRangeAvailabilitySchema,
  createAirportTransferAvailabilitySchema,
  availableDatesQuerySchema,
} = require("../schemas/productAvailability.schema");
const {
  createCabServiceAvailabilitySchema,
} = require("../schemas/cabServiceAvailability.schema");
const transferLocations = require("../constants/transferLocations");
const {
  DateRangeAvailabilityError,
} = require("../services/availability/availableVendorDateRange.service.js");
const {
  checkDateRange,
} = require("../services/availability/dateRange.service.js");
const {
  checkSingleDate,
} = require("../services/availability/singleDate.service.js");
const {
  checkAirportTransfer,
} = require("../services/availability/airportTransfer.service.js");
const {
  checkCabService,
} = require("../services/availability/cabService.service.js");
const {
  AvailableDatesError,
  getAvailableDates,
} = require("../services/availability/availableDates.service");
const {
  getNextAvailableSlotForProduct,
} = require("../services/nextAvailableSlot.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const isBikeRentalProduct = (product) =>
  product?.productType?.slug === "bike-rentals";

const normalizeLocationKey = (value) =>
  value.trim().toLowerCase().replace(/[\s_]+/g, "-");

const getTransferLocationsForLocation = (locationSlug) =>
  transferLocations.filter(
    ({ place }) => normalizeLocationKey(place) === locationSlug,
  );

const transferAvailabilityHandlers = {
  airport_transfer: {
    createSchema: createAirportTransferAvailabilitySchema,
    checkAvailability: checkAirportTransfer,
  },
  cab_service: {
    createSchema: createCabServiceAvailabilitySchema,
    checkAvailability: checkCabService,
  },
};

const checkProductAvailability = async (req, res) => {
  try {
    const { slug } = req.params;

    const payload = { ...req.body };

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
          model: ProductFaq,
          as: "faqs",
          required: false,
          separate: true,
          where: { active: true },
          attributes: ["question", "answer", "sort_order"],
          order: [
            ["sort_order", "ASC"],
            ["id", "ASC"],
          ],
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

    const location = await Location.findOne({
      attributes: ["id", "slug", "name"],
      where: {
        slug: payload.location_slug,
        active: true,
      },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found.",
      });
    }

    const today = moment().tz(APP_TIMEZONE).startOf("day");
    const defaultPickupDate = isBikeRentalProduct(product)
      ? today.clone().add(1, "day")
      : today;

    payload.date = payload.date || today.format("YYYY-MM-DD");
    payload.pickup_date =
      payload.pickup_date ||
      defaultPickupDate.format("YYYY-MM-DD");
    payload.return_date =
      payload.return_date ||
      moment
        .tz(payload.pickup_date, "YYYY-MM-DD", true, APP_TIMEZONE)
        .add(1, "day")
        .format("YYYY-MM-DD");
    payload.pickup_time = payload.pickup_time || "10:00";

    /**
     * Validate request
     */
    const schemaMap = {
      single_date: checkSingleDateAvailabilitySchema,
      date_range: checkDateRangeAvailabilitySchema,
    };
    const handlers = {
      single_date: checkSingleDate,
      date_range: checkDateRange,
    };

    const availabilityHandler =
      product.bookingTemplate?.availability_handler || "standard";
    const isSingleDateBooking = product.booking_mode === "single_date";
    const transferHandler =
      transferAvailabilityHandlers[availabilityHandler] || null;
    const locations = transferHandler
      ? getTransferLocationsForLocation(location.slug)
      : null;

    if (!schemaMap[product.booking_mode]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported booking mode '${product.booking_mode}'.`,
      });
    }

    if (availabilityHandler !== "standard" && !transferHandler) {
      return res.status(400).json({
        success: false,
        message: `Unsupported availability handler '${availabilityHandler}'.`,
      });
    }

    if (transferHandler && !isSingleDateBooking) {
      return res.status(400).json({
        success: false,
        message: `Availability handler '${availabilityHandler}' requires single_date booking mode.`,
      });
    }

    if (transferHandler && !locations.length) {
      return res.status(400).json({
        success: false,
        message: "Transfer service is not configured for the selected location.",
      });
    }

    const schema =
      isSingleDateBooking && transferHandler
        ? transferHandler.createSchema({ locations })
        : schemaMap[product.booking_mode];

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
      product.pricing_mode === "quantity" ? "quantity" : "guests";

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
     * Booking Mode Dispatcher
     */
    const handler =
      isSingleDateBooking && transferHandler
        ? transferHandler.checkAvailability
        : handlers[product.booking_mode];

    const result = await handler({
      product,
      location,
      payload: availabilityPayload,
      estimateId: availabilityPayload.estimate_id,
      ...(transferHandler ? { locations } : {}),
    });

    // The selected date already has availability - no need to suggest one.
    const nextAvailableDate = result?.available
      ? null
      : await getNextAvailableSlotForProduct({
          productId: product.id,
          locationId: location.id,
          guests: availabilityPayload.pricing_quantity,
          fromDate:
            availabilityPayload.date ||
            availabilityPayload.pickup_date,
        });

    if (result?.data?.product) {
      result.data.product.next_available_date = nextAvailableDate;
    }

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



const getAvailableTransferLocations = async (req, res) => {
  try {
    const locationSlug = String(req.query.location_slug || "")
      .trim()
      .toLowerCase();

    if (!locationSlug) {
      return res.status(400).json({
        success: false,
        message: "location_slug is required.",
      });
    }

    const product = await Product.findOne({
      attributes: ["slug"],
      where: {
        slug: req.params.slug,
        active: true,
      },
      include: [
        {
          model: BookingTemplate,
          as: "bookingTemplate",
          attributes: ["availability_handler"],
          required: true,
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const location = await Location.findOne({
      attributes: ["slug", "name"],
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

    const availabilityHandler = product.bookingTemplate.availability_handler;
    const transferHandler =
      transferAvailabilityHandlers[availabilityHandler] || null;

    if (!transferHandler) {
      return res.status(400).json({
        success: false,
        message: "Transfer locations are not configured for this product.",
      });
    }

    const data = getTransferLocationsForLocation(location.slug);

    if (!data.length) {
      return res.status(400).json({
        success: false,
        message: "Transfer service is not configured for the selected location.",
      });
    }

    return res.status(200).json({
      success: true,
      allow_custom: true,
      selected_location: location,
      data,
    });
  } catch (error) {
    console.error("getAvailableTransferLocations:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transfer locations.",
    });
  }
};

module.exports = {
  checkProductAvailability,
  getProductAvailableDates,
  getAvailableTransferLocations,
};
