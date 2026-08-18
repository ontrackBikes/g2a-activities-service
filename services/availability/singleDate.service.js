// services/booking/singleDate.service.js

const moment = require("moment-timezone");

const { getAvailableVendorForProduct } = require("./availableVendor.service");

const buildBookingQuote = require("./buildBookingQuote");
const { saveBookingEstimate } = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const crypto = require("crypto");

const getEffectiveMaxBookable = ({
  vendorMax,
  available,
}) => {
  const parsedVendorMax = Number(vendorMax);
  const parsedAvailable = Number(available);
  const limits = [
    parsedVendorMax,
    parsedAvailable,
  ].filter(
    (value) =>
      Number.isFinite(value) && value >= 0,
  );

  return limits.length ? Math.min(...limits) : 0;
};

const getSlotType = (slot) =>
  slot?.slot_type ||
  (slot?.start_time && slot?.end_time
    ? "TIME"
    : "VARIANT");

const getServiceHours = (slotsWithTimes) => {
  const hours = slotsWithTimes
    .filter((slot) => slot?.start_time && slot?.end_time)
    .map((slot) => ({
      start_time: slot.start_time,
      end_time: slot.end_time,
    }));

  return hours.length ? hours : null;
};

const checkSingleDate = async ({ product, location, payload, estimateId }) => {
  const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");
  const pricingQuantity = payload.pricing_quantity;

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
    guests: pricingQuantity,
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
        "This product is not available for the selected date and location.",

      data: buildBookingQuote({
        product,

        location,

        booking: {
          travel_date: payload.date,
          guests: payload.guests,
          quantity: payload.quantity,
        },
      }),
    };
  }

  /**
   * Available
   */

  const isSlotPricing = availability.vendorProduct.pricing_type === "SLOT";

  const slot_mapping = {};

  const slots = isSlotPricing
    ? availability.slots.map((slot) => {
        const token = `slot_${crypto
          .createHash("sha1")
          .update(String(slot.id))
          .digest("hex")
          .substring(0, 16)}`;

        slot_mapping[token] = slot.id;

        return {
          token,

          name: slot.slot_name,

          slot_type: getSlotType(slot),

          start_time: slot.start_time,

          end_time: slot.end_time,

          duration_minutes: slot.duration_minutes,

          priced_by: slot.priced_by,

          is_preferred: Boolean(slot.is_preferred),

          is_start_time_only: Boolean(slot.is_start_time_only),

          price: Number(slot.price),

          available: slot.available,

          max_bookable_per_booking:
            getEffectiveMaxBookable({
              vendorMax:
                availability.vendorProduct
                  .max_bookable_per_booking,
              available: slot.available,
            }),
        };
      })
    : [];

  let selectedSlot = slots.length ? slots[0] : null;

  if (isSlotPricing && payload.selected_slot_token) {
    const found = slots.find(
      (slot) => slot.token === payload.selected_slot_token,
    );

    if (found) {
      selectedSlot = found;
    }
  }

  const selectedVendorSlot = isSlotPricing
    ? availability.slots.find(
        (slot) => slot.id === slot_mapping[selectedSlot.token],
      )
    : availability.slots[0];

  /**
   * Pricing
   */

  const unitPrice = isSlotPricing
    ? Number(selectedVendorSlot.price)
    : Number(availability.pricing.display_price);

  const subtotal = unitPrice * pricingQuantity;

  const fixedScheduleSlot = !isSlotPricing ? availability.slots[0] : null;
  const effectiveMaxBookable = isSlotPricing
    ? selectedSlot?.max_bookable_per_booking || 0
    : getEffectiveMaxBookable({
        vendorMax:
          availability.vendorProduct
            .max_bookable_per_booking,
        available: fixedScheduleSlot?.available,
      });

  const quotation = buildBookingQuote({
    product,

    location,

    booking: {
      travel_date: payload.date,
      guests: payload.guests,
      quantity: payload.quantity,
    },

    pricing: {
      currency: "INR",

      pricing_type: availability.pricing.price_type,

      unit_price: unitPrice,

      quantity: pricingQuantity,

      subtotal,

      discount: 0,

      tax: 0,

      grand_total: subtotal,

      max_bookable_per_booking:
        effectiveMaxBookable,
    },

    availability: {
      pricing_type: availability.vendorProduct.pricing_type,

      slots,
      selected_slot: selectedSlot,
      inventory: fixedScheduleSlot
        ? {
            available: fixedScheduleSlot.available,
            max_bookable_per_booking:
              effectiveMaxBookable,
          }
        : null,

      service_hours: isSlotPricing
        ? getServiceHours(availability.slots)
        : getServiceHours(
            [fixedScheduleSlot].filter(Boolean),
          ),
    },
  });

  const estimate = await saveBookingEstimate({
    estimateId,

    product,
    location,

    vendorProduct: availability.vendorProduct,
    vendorSchedule: availability.schedule,
    vendorScheduleSlot: selectedVendorSlot,
    selectedSlotToken: selectedSlot?.token,

    requestData: payload,
    bookingData: quotation.booking,

    pricing: quotation.pricing,

    quotation,

    metadata: {
      slot_mapping,
      selected_slot_token: selectedSlot?.token || null,
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
