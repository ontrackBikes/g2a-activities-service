// services/booking/singleDate.service.js

const moment = require("moment-timezone");

const {
  getAvailableVendorForProduct,
} = require("./availableVendor.service");

const buildBookingQuote = require("./buildBookingQuote");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const checkSingleDate = async ({
  product,
  location,
  payload,
}) => {
  const today = moment()
    .tz(APP_TIMEZONE)
    .format("YYYY-MM-DD");

  /**
   * Validate Date
   */

  if (
    !moment(
      payload.date,
      "YYYY-MM-DD",
      true,
    ).isValid()
  ) {
    return {
      status: 400,
      success: false,
      message:
        "date must be a valid calendar date",
    };
  }

  if (payload.date < today) {
    return {
      status: 400,
      success: false,
      message:
        "date cannot be in the past",
    };
  }

  /**
   * Availability
   */

  const availability =
    await getAvailableVendorForProduct({
      productId: product.id,
      locationId: location.id,
      date: payload.date,
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
        "Product is not available for the selected date, location and guests",

      data: buildBookingQuote({
        product,

        location,

        booking: {
          travel_date: payload.date,
          guests: payload.guests,
        },
      }),
    };
  }

  /**
   * Pricing
   */

  const unitPrice = Number(
    availability.pricing.display_price,
  );

  const subtotal =
    unitPrice * payload.guests;

  /**
   * Available
   */

  return {
    status: 200,

    success: true,

    available: true,

    data: buildBookingQuote({
      product,

      location,

      booking: {
        travel_date: payload.date,
        guests: payload.guests,
      },

      pricing: {
        currency: "INR",

        price_type:
          availability.pricing.price_type,

        unit_price: unitPrice,

        quantity: payload.guests,

        subtotal,

        discount: 0,

        tax: 0,

        grand_total: subtotal,
      },

      availability: {
        vendor_product_id:
          availability.vendorProduct.id,

        pricing_type:
          availability.vendorProduct.pricing_type,

        slots: availability.slots.map(
          (slot) => ({
            id: slot.id,

            name: slot.slot_name,

            start_time: slot.start_time,

            end_time: slot.end_time,

            price: Number(slot.price),

            available: slot.available,

            max_bookable_per_booking:
              slot.max_bookable_per_booking,
          }),
        ),
      },
    }),
  };
};

module.exports = {
  checkSingleDate,
};