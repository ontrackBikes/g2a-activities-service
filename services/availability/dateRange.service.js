const moment = require("moment-timezone");

const {
  getAvailableDateRangeVendor,
  DateRangeAvailabilityError,
} = require("./dateRangeAvailability.service");
const buildBookingQuote = require("./buildBookingQuote");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

module.exports.checkDateRange = async ({ product, location, payload }) => {
  try {
    const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

    /**
     * Validate Dates
     */

    if (!moment(payload.pickup_date, "YYYY-MM-DD", true).isValid()) {
      return {
        status: 400,
        success: false,
        message: "pickup_date must be a valid calendar date",
      };
    }

    if (!moment(payload.return_date, "YYYY-MM-DD", true).isValid()) {
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

    const availability = await getAvailableDateRangeVendor({
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
        success: true,

        available: false,

        message: "Product is not available for the selected dates.",

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
     * Available
     */

    return {
      success: true,

      available: true,

      data: buildBookingQuote({
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
          daily_pricing: availability.daily_pricing.map((day) => ({
            date: day.date,

            unit_price: day.unit_price,
          })),
        },
      }),
    };
  } catch (error) {
    if (error instanceof DateRangeAvailabilityError) {
      return res.status(error.statusCode).json({
        success: false,

        message: error.message,

        code: error.code,
      });
    }

    throw error;
  }
};
