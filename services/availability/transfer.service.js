const moment = require("moment-timezone");

const { getAvailableVendorForProduct } = require("./availableVendor.service");
const buildBookingQuote = require("./buildBookingQuote");
const { saveBookingEstimate } = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const SAME_DAY_BOOKING_LEAD_TIME_HOURS = 12;

const getLocationSnapshot = (location, locations) => {
  if (location == null) {
    return null;
  }

  if (location.type === "custom") {
    return {
      name: location.name,
      type: "custom",
      address: location.address,
    };
  }

  const configuredLocation = locations.find(({ id }) => id === location);

  return configuredLocation
    ? {
        id: configuredLocation.id,
        name: configuredLocation.name,
        type: configuredLocation.type,
        address: configuredLocation.address,
      }
    : null;
};

const buildTransferBooking = ({ payload, includeTransferType, locations }) => ({
  travel_date: payload.date,
  guests: payload.guests,
  quantity: payload.quantity,
  ...(includeTransferType ? { transfer_type: payload.transfer_type } : {}),
  pickup_location: getLocationSnapshot(payload.pickup_location, locations),
  drop_location: getLocationSnapshot(payload.drop_location, locations),
  pickup_time: payload.pickup_time,
});

const getEffectiveMaxBookable = ({ vendorProduct, scheduleSlot }) =>
  Math.min(
    Number(vendorProduct.max_bookable_per_booking),
    Number(scheduleSlot.max_bookable_per_booking),
    Number(scheduleSlot.available),
  );

const getServiceHours = (scheduleSlot) =>
  scheduleSlot.start_time && scheduleSlot.end_time
    ? {
        start_time: scheduleSlot.start_time,
        end_time: scheduleSlot.end_time,
      }
    : null;

const getTimeOnDate = (date, time) =>
  moment.tz(
    `${date} ${time}`,
    ["YYYY-MM-DD HH:mm", "YYYY-MM-DD HH:mm:ss"],
    true,
    APP_TIMEZONE,
  );

const getPickupTimeError = ({ date, pickupTime, scheduleSlot, serviceName }) => {
  const pickupAt = getTimeOnDate(date, pickupTime);

  if (date === moment().tz(APP_TIMEZONE).format("YYYY-MM-DD")) {
    const earliestPickupAt = moment()
      .tz(APP_TIMEZONE)
      .add(SAME_DAY_BOOKING_LEAD_TIME_HOURS, "hours")
      .startOf("minute");

    if (pickupAt.isBefore(earliestPickupAt)) {
      return `pickup_time must be at least 12 hours from now for today's ${serviceName.toLowerCase()}.`;
    }
  }

  if (!scheduleSlot.start_time || !scheduleSlot.end_time) {
    return null;
  }

  const startsAt = getTimeOnDate(date, scheduleSlot.start_time);
  const endsAt = getTimeOnDate(date, scheduleSlot.end_time);

  return pickupAt.isBefore(startsAt) || !pickupAt.isBefore(endsAt)
    ? "pickup_time is outside the available service hours."
    : null;
};

const checkTransferAvailability = async ({
  product,
  location,
  payload,
  estimateId,
  serviceName,
  locations,
  includeTransferType = false,
}) => {
  const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

  if (!moment(payload.date, "YYYY-MM-DD", true).isValid()) {
    return { status: 400, success: false, message: "date must be a valid calendar date" };
  }

  if (payload.date < today) {
    return { status: 400, success: false, message: "date cannot be in the past" };
  }

  const booking = buildTransferBooking({
    payload,
    includeTransferType,
    locations,
  });

  const availability = await getAvailableVendorForProduct({
    productId: product.id,
    locationId: location.id,
    date: payload.date,
    guests: payload.quantity,
    ignoreSameDaySlotStartTime: true,
  });

  const scheduleSlot = availability?.slots[0] || null;
  const availabilityDetails = scheduleSlot
    ? {
        inventory: {
          available: scheduleSlot.available,
          max_bookable_per_booking: getEffectiveMaxBookable({
            vendorProduct: availability.vendorProduct,
            scheduleSlot,
          }),
        },
        service_hours: getServiceHours(scheduleSlot),
      }
    : {};

  if (payload.pickup_location == null || payload.drop_location == null) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Please select a pickup and drop location to continue.",
      data: buildBookingQuote({
        product,
        location,
        booking,
        availability: availabilityDetails,
      }),
    };
  }

  if (!availability) {
    return {
      status: 200,
      success: true,
      available: false,
      message: `${serviceName} is not available for the selected date.`,
      data: buildBookingQuote({ product, location, booking }),
    };
  }

  const maxBookablePerBooking =
    availabilityDetails.inventory.max_bookable_per_booking;
  const pickupTimeError = getPickupTimeError({
    date: payload.date,
    pickupTime: payload.pickup_time,
    scheduleSlot,
    serviceName,
  });

  if (pickupTimeError) {
    return {
      status: 200,
      success: true,
      available: false,
      message: pickupTimeError,
      data: buildBookingQuote({
        product,
        location,
        booking,
        availability: availabilityDetails,
      }),
    };
  }

  if (payload.quantity > maxBookablePerBooking) {
    return {
      status: 200,
      success: true,
      available: false,
      message: `${serviceName} is not available for the selected quantity.`,
      data: buildBookingQuote({
        product,
        location,
        booking,
        availability: availabilityDetails,
      }),
    };
  }

  const unitPrice = Number(scheduleSlot.price ?? availability.vendorProduct.base_price);
  const subtotal = unitPrice * payload.quantity;
  const quotation = buildBookingQuote({
    product,
    location,
    booking,
    pricing: {
      currency: "INR",
      pricing_type: "FIXED",
      unit_price: unitPrice,
      quantity: payload.quantity,
      subtotal,
      discount: 0,
      tax: 0,
      grand_total: subtotal,
      max_bookable_per_booking: maxBookablePerBooking,
    },
    availability: availabilityDetails,
  });

  const estimate = await saveBookingEstimate({
    estimateId,
    product,
    location,
    vendorProduct: availability.vendorProduct,
    vendorSchedule: availability.schedule,
    vendorScheduleSlot: scheduleSlot,
    requestData: payload,
    bookingData: quotation.booking,
    pricing: quotation.pricing,
    quotation,
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

module.exports = { checkTransferAvailability };
