const moment = require("moment-timezone");

const {
  getAvailableDateRangeVendor,
  DateRangeAvailabilityError,
} = require("./availableVendorDateRange.service");
const buildBookingQuote = require("./buildBookingQuote");
const { createBookingEstimate } = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

module.exports.checkDateRange = async ({
  product,
  location,
  payload,
}) => {
  const today = moment()
    .tz(APP_TIMEZONE)
    .format("YYYY-MM-DD");

  /**
   * Validate Dates
   */

  if (
    !moment(payload.pickup_date, "YYYY-MM-DD", true).isValid()
  ) {
    return {
      status: 400,
      success: false,
      message: "pickup_date must be a valid calendar date",
    };
  }

  if (
    !moment(payload.return_date, "YYYY-MM-DD", true).isValid()
  ) {
    return {
      status: 400,
      success: false,
      message: "return_date must be a valid calendar date",
    };
  }

  if (payload.pickup_date < today) {
    return {
      status: 400,
      success: false,
      message: "pickup_date cannot be in the past",
    };
  }

  if (payload.return_date < payload.pickup_date) {
    return {
      status: 400,
      success: false,
      message: "return_date must be after pickup_date",
    };
  }

  /**
   * Availability
   */

  const availability =
    await getAvailableDateRangeVendor({
      productId: product.id,
      locationId: location.id,
      pickupDate: payload.pickup_date,
      returnDate: payload.return_date,
      guests: payload.guests,
    });

  /**
   * Not Available
   */

  if (!availability) {
    return {
      status: 200,
      success: true,
      available: false,
      message:
        "Product is not available for the selected dates.",

      data: buildBookingQuote({
        product,
        location,

        booking: {
          pickup_date: payload.pickup_date,
          return_date: payload.return_date,
          guests: payload.guests,
        },
      }),
    };
  }

  /**
   * Build quotation
   */

  const quotation = buildBookingQuote({
    product,
    location,

    booking: {
      pickup_date: availability.start_date,
      return_date: availability.end_date,
      rental_days: availability.rental_days,
      guests: availability.guests,
    },

    pricing: {
      currency: "INR",
      price_type: "flat",

      unit_price: availability.unit_price_total,
      quantity: availability.guests,

      subtotal: availability.rental_total,
      discount: 0,
      tax: 0,
      grand_total: availability.rental_total,
    },

    availability: {
      daily_pricing: availability.daily_pricing.map(
        (day) => ({
          date: day.date,
          unit_price: day.unit_price,
        }),
      ),
    },
  });

  /**
   * Create Estimate
   */

  const estimate = await createBookingEstimate({
    product,

    location,

    vendorProduct: availability.vendorProduct,

    requestData: payload,

    bookingData: quotation.booking,

    pricing: quotation.pricing,

    quotation,

    metadata: {},
  });

  quotation.estimate_id = estimate.estimate_id;

  /**
   * Response
   */

  return {
    status: 200,
    success: true,
    available: true,
    estimate_id: estimate.estimate_id,
    data: quotation,
  };
};
