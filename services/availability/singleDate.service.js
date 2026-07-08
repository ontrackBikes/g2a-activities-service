// services/booking/singleDate.service.js

const moment = require("moment-timezone");

const { getAvailableVendorForProduct } = require("./availableVendor.service");

const buildBookingQuote = require("./buildBookingQuote");
const { randomUUID } = require("crypto");
const { saveBookingEstimate } = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const checkSingleDate = async ({ product, location, payload, estimateId }) => {
  const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

  /**
   * Validate Date
   */

  if (!moment(payload.date, "YYYY-MM-DD", true).isValid()) {
    return {
      status: 400,
      success: false,
      message: "date must be a valid calendar date",
    };
  }

  if (payload.date < today) {
    return {
      status: 400,
      success: false,
      message: "date cannot be in the past",
    };
  }

  /**
   * Availability
   */

  const availabilityPayload = {
    productId: product.id,
    locationId: location.id,
    date: payload.date,
    guests: payload.guests,
  };

  const availability = await getAvailableVendorForProduct(availabilityPayload);

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

  const unitPrice = Number(availability.pricing.display_price);

  const subtotal = unitPrice * payload.guests;

  /**
   * Available
   */

  const isSlotPricing = availability.vendorProduct.pricing_type === "SLOT";

  const slot_mapping = {};

  const slots = isSlotPricing
    ? availability.slots.map((slot) => {
        const token = `slot_${randomUUID().replace(/-/g, "")}`;

        slot_mapping[token] = slot.id;

        return {
          token,

          name: slot.slot_name,

          start_time: slot.start_time,

          end_time: slot.end_time,

          price: Number(slot.price),

          available: slot.available,

          max_bookable_per_booking: slot.max_bookable_per_booking,
        };
      })
    : [];

  const selectedSlot = slots.length ? slots[0] : null;
  const fixedScheduleSlot = !isSlotPricing ? availability.slots[0] : null;

  const quotation = buildBookingQuote({
    product,

    location,

    booking: {
      travel_date: payload.date,
      guests: payload.guests,
    },

    pricing: {
      currency: "INR",

      pricing_type: availability.pricing.price_type,

      unit_price: unitPrice,

      quantity: payload.guests,

      subtotal,

      discount: 0,

      tax: 0,

      grand_total: subtotal,
    },

    availability: {
      pricing_type: availability.vendorProduct.pricing_type,

      slots,
      selected_slot: selectedSlot
        ? {
            token: selectedSlot.token,
            slot_id: slot_mapping[selectedSlot.token],
          }
        : null,
      inventory: fixedScheduleSlot
        ? {
            available: fixedScheduleSlot.available,
            max_bookable_per_booking:
              fixedScheduleSlot.max_bookable_per_booking,
          }
        : null,
    },
  });

  const estimate = await saveBookingEstimate({
    estimateId,

    product,
    location,

    vendorProduct: availability.vendorProduct,
    vendorSchedule: availability.schedule,
    vendorScheduleSlot: fixedScheduleSlot,

    requestData: payload,
    bookingData: quotation.booking,

    pricing: quotation.pricing,

    quotation,

    metadata: {
      slot_mapping,
    },
  });

  quotation.estimate_id = estimate.estimate_id;

  return {
    status: 200,

    success: true,

    available: true,
    estimate_id: estimate.estimate_id,
    data: quotation,
  };
};

module.exports = {
  checkSingleDate,
};
