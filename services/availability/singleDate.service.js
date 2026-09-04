// services/booking/singleDate.service.js

const moment = require("moment-timezone");

const {
  getAvailableVendorForProduct,
  getMaxBookablePerBooking,
  getMinBookablePerBooking,
} = require("./availableVendor.service");

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

const getEffectiveMinBookable = ({ vendorMin, slotMin }) =>
  Math.max(Number(vendorMin) || 1, Number(slotMin) || 1);

const getSlotType = (slot) =>
  slot?.templateSlot?.slot_type ||
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

// Service-hour strings may come back as "HH:mm" (payload) or "HH:mm:ss"
// (DataTypes.TIME columns) - compare on the first 5 chars either way.
const normalizeTime = (time) =>
  typeof time === "string" ? time.slice(0, 5) : time;

const isWithinServiceHours = (time, serviceHours) => {
  if (!Array.isArray(serviceHours) || !serviceHours.length) {
    return true;
  }

  const normalizedTime = normalizeTime(time);

  return serviceHours.some(
    (window) =>
      normalizedTime >= normalizeTime(window.start_time) &&
      normalizedTime <= normalizeTime(window.end_time),
  );
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
    const maxBookablePerBooking = await getMaxBookablePerBooking({
      productId: product.id,
      locationId: location.id,
    });
    const minBookablePerBooking = await getMinBookablePerBooking({
      productId: product.id,
      locationId: location.id,
    });

    const message =
      minBookablePerBooking !== null &&
      pricingQuantity < minBookablePerBooking
        ? `Requested quantity ${pricingQuantity} is below the minimum required per booking ${minBookablePerBooking}.`
        : maxBookablePerBooking !== null &&
      pricingQuantity > maxBookablePerBooking
        ? `Requested quantity ${pricingQuantity} exceeds the maximum allowed per booking ${maxBookablePerBooking}.`
        : "This product is not available for the selected date and location.";

    return {
      status: 200,

      success: true,

      available: false,

      message,

      data: buildBookingQuote({
        product,

        location,

        booking: {
          date: payload.date,
          guests: payload.guests,
          quantity: payload.quantity,
          pickup_time: payload.pickup_time || null,
          preferred_time: payload.preferred_time || null,
        },
        pricing: {
          min_bookable_per_booking: minBookablePerBooking ?? 1,
          max_bookable_per_booking: maxBookablePerBooking ?? 0,
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

          nationality_restriction: slot.nationality_restriction || "ALL",

          description: slot.description || null,

          price: Number(slot.price),

          available: slot.available,

          max_bookable_per_booking:
            getEffectiveMaxBookable({
              vendorMax:
                availability.vendorProduct
                  .max_bookable_per_booking,
              available: slot.available,
            }),
          min_bookable_per_booking:
            getEffectiveMinBookable({
              vendorMin:
                availability.vendorProduct.min_bookable_per_booking,
              slotMin: slot.min_bookable_per_booking,
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

  const nationalityRestriction = selectedVendorSlot?.nationality_restriction || "ALL";
  const slotDescription = selectedVendorSlot?.description || null;

  /**
   * Pricing
   */

  const unitPrice = isSlotPricing
    ? Number(selectedVendorSlot.price)
    : Number(availability.pricing.display_price);

  const subtotal = unitPrice * pricingQuantity;

  const fixedScheduleSlot = !isSlotPricing ? availability.slots[0] : null;

  const serviceHours = isSlotPricing
    ? getServiceHours(availability.slots)
    : getServiceHours([fixedScheduleSlot].filter(Boolean));

  if (
    payload.preferred_time &&
    !isWithinServiceHours(payload.preferred_time, serviceHours)
  ) {
    return {
      status: 200,

      success: true,

      available: false,

      message: "preferred_time must be within the available service hours.",

      data: buildBookingQuote({
        product,

        location,

        booking: {
          date: payload.date,
          guests: payload.guests,
          quantity: payload.quantity,
          pickup_time: payload.pickup_time || null,
          preferred_time: payload.preferred_time || null,
        },

        availability: {
          pricing_type: availability.vendorProduct.pricing_type,
          slots,
          selected_slot: selectedSlot,
          service_hours: serviceHours,
          nationality_restriction: nationalityRestriction,
          description: slotDescription,
        },
      }),
    };
  }

  const effectiveMaxBookable = isSlotPricing
    ? selectedSlot?.max_bookable_per_booking || 0
    : getEffectiveMaxBookable({
        vendorMax:
          availability.vendorProduct
            .max_bookable_per_booking,
        available: fixedScheduleSlot?.available,
      });
  const effectiveMinBookable = getEffectiveMinBookable({
    vendorMin: availability.vendorProduct.min_bookable_per_booking,
    slotMin: selectedVendorSlot?.min_bookable_per_booking,
  });

  const quotation = buildBookingQuote({
    product,

    location,

    booking: {
      date: payload.date,
      guests: payload.guests,
      quantity: payload.quantity,
      pickup_time: payload.pickup_time || null,
      preferred_time: payload.preferred_time || null,
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
      min_bookable_per_booking:
        effectiveMinBookable,
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
            min_bookable_per_booking:
              effectiveMinBookable,
          }
        : null,

      service_hours: serviceHours,

      nationality_restriction: nationalityRestriction,

      description: slotDescription,
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
