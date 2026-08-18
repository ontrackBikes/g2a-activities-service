const crypto = require("crypto");
const moment = require("moment-timezone");

const {
  getAvailableDateRangeVendor,
  DateRangeAvailabilityError,
} = require("./availableVendorDateRange.service");
const buildBookingQuote = require("./buildBookingQuote");
const { saveBookingEstimate } = require("./createBookingEstimate.service");
const { isBeforeLeadTime } = require("../bookingLeadTime.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const isBikeRentalProduct = (product) => {
  return product?.productType?.slug === "bike-rentals";
};

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

const getSlotTokenSource = (slot) =>
  slot?.vendor_product_slot_id || slot?.id;

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

module.exports.checkDateRange = async ({
  product,
  location,
  payload,
  estimateId,
}) => {
  const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");
  const pricingQuantity = payload.pricing_quantity;

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

  if (isBikeRentalProduct(product) && payload.pickup_date === today) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Bike rentals can be booked from tomorrow onwards.",
      data: buildBookingQuote({
        product,
        location,
        booking: {
          pickup_date: payload.pickup_date,
          pickup_time: payload.pickup_time,
          preferred_time: payload.preferred_time || null,
          return_date: payload.return_date,
          drop_time: payload.pickup_time,
          guests: payload.guests,
          quantity: pricingQuantity,
        },
      }),
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
    pickupTime: payload.pickup_time,
    guests: pricingQuantity,
    selectedSlotToken:
      payload.selected_slot_token || null,
  });


  /**
   * Not Available
   */

  if (!availability) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Product is not available for the selected dates.",

      data: buildBookingQuote({
        product,
        location,

        booking: {
          pickup_date: payload.pickup_date,
          pickup_time: payload.pickup_time,
          preferred_time: payload.preferred_time || null,
          return_date: payload.return_date,
          drop_time: payload.pickup_time,
          guests: payload.guests,
          quantity: payload.quantity,
        },
      }),
    };
  }

  if (
    isBeforeLeadTime({
      date: availability.start_date,
      time: availability.pickup_time,
      minBookingLeadHours: availability.vendorProduct.min_booking_lead_hours,
    })
  ) {
    return {
      status: 200,
      success: true,
      available: false,
      message: `pickup_time must be at least ${availability.vendorProduct.min_booking_lead_hours} hours from now.`,

      data: buildBookingQuote({
        product,
        location,

        booking: {
          pickup_date: payload.pickup_date,
          pickup_time: payload.pickup_time,
          preferred_time: payload.preferred_time || null,
          return_date: payload.return_date,
          drop_time: payload.pickup_time,
          guests: payload.guests,
          quantity: payload.quantity,
        },
      }),
    };
  }

  const isSlotPricing =
    availability.vendorProduct.pricing_type === "SLOT";

  const dailyPricing = Array.isArray(
    availability.daily_pricing,
  )
    ? availability.daily_pricing
    : [];

  const availableSlots =
    Array.isArray(availability.slots) &&
    availability.slots.length
      ? availability.slots
      : availability.selected_slot
        ? [availability.selected_slot]
        : dailyPricing
            .map((day) => day.slot)
            .filter(Boolean);

  const slot_mapping = {};

  const slots = isSlotPricing
    ? availableSlots.map((slot) => {
        const token = `slot_${crypto
          .createHash("sha1")
          .update(String(getSlotTokenSource(slot)))
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

  const selectedSlot =
    slots.find(
      (slot) =>
        slot_mapping[slot.token] ===
        availability.selected_slot?.id,
    ) ||
    slots[0] ||
    null;
  const firstDailyPricing = dailyPricing[0] || null;
  const fixedScheduleSlot = !isSlotPricing
    ? firstDailyPricing?.slot || null
    : null;

  const serviceHours = isSlotPricing
    ? getServiceHours(availableSlots)
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
          pickup_date: payload.pickup_date,
          pickup_time: payload.pickup_time,
          preferred_time: payload.preferred_time || null,
          return_date: payload.return_date,
          drop_time: payload.pickup_time,
          guests: payload.guests,
          quantity: pricingQuantity,
        },

        availability: {
          slots,
          selected_slot: selectedSlot,
          service_hours: serviceHours,
        },
      }),
    };
  }

  const vendorSchedule =
    firstDailyPricing?.schedule || null;
  const inventorySlot =
    selectedSlot || fixedScheduleSlot;
  const max_bookable_per_booking =
    getEffectiveMaxBookable({
      vendorMax:
        availability.vendorProduct
          .max_bookable_per_booking,
      available: inventorySlot?.available,
    });

  /**
   * Build quotation
   */

  const quotation = buildBookingQuote({
    product,
    location,

    booking: {
      pickup_date: availability.start_date,
      pickup_time: availability.pickup_time,
      preferred_time: payload.preferred_time || null,
      return_date: availability.end_date,
      drop_time: availability.drop_time,
      rental_days: availability.rental_days,
      guests: payload.guests,
      quantity: pricingQuantity,
    },

    pricing: {
      currency: "INR",
      pricing_type:
        availability.vendorProduct.pricing_type,

      unit_price: availability.unit_price_total,
      quantity: payload.quantity,

      subtotal: availability.rental_total,
      discount: 0,
      tax: 0,
      grand_total: availability.rental_total,

      max_bookable_per_booking
    },

    availability: {
      slots,
      selected_slot: selectedSlot,
      daily_pricing: dailyPricing.map((day) => ({
        date: day.date,
        unit_price: day.unit_price,
      })),
      service_hours: serviceHours,
    },
  });

  /**
   * Create Estimate
   */

  const estimate = await saveBookingEstimate({
    estimateId,

    product,
    location,

    vendorProduct: availability.vendorProduct,
    vendorSchedule,
    vendorScheduleSlot: fixedScheduleSlot,
    selectedSlotToken: selectedSlot?.token,

    requestData: payload,
    bookingData: quotation.booking,

    pricing: quotation.pricing,

    quotation,

    metadata: {
      slot_mapping,
      inventory_slots: dailyPricing.map((day) => ({
        date: day.date,
        vendor_schedule_id:
          day.schedule?.id || null,
        vendor_schedule_slot_id:
          day.slot?.id || null,
      })),
    },
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
