const moment = require("moment-timezone");

const airportTransferLocations = require("../../constants/airportTransferLocations");
const { getAvailableVendorForProduct } = require("./availableVendor.service");
const buildBookingQuote = require("./buildBookingQuote");
const { saveBookingEstimate } = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const SAME_DAY_BOOKING_LEAD_TIME_HOURS = 12;

const getLocationSnapshot = (location) => {
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

  const configuredLocation = airportTransferLocations.find(
    ({ id }) => id === location,
  );

  if (!configuredLocation) {
    return null;
  }

  return {
    id: configuredLocation.id,
    name: configuredLocation.name,
    type: configuredLocation.type,
    address: configuredLocation.address,
  };
};

const getEffectiveMaxBookable = ({ vendorProduct, scheduleSlot }) =>
  Math.min(
    Number(vendorProduct.max_bookable_per_booking),
    Number(scheduleSlot.max_bookable_per_booking),
    Number(scheduleSlot.available),
  );

const getTimeOnDate = (date, time) =>
  moment.tz(
    `${date} ${time}`,
    ["YYYY-MM-DD HH:mm", "YYYY-MM-DD HH:mm:ss"],
    true,
    APP_TIMEZONE,
  );

const getPickupTimeError = ({ date, pickupTime, scheduleSlot }) => {
  const pickupAt = getTimeOnDate(date, pickupTime);

  if (date === moment().tz(APP_TIMEZONE).format("YYYY-MM-DD")) {
    const now = moment().tz(APP_TIMEZONE);
    const earliestPickupAt = now
      .clone()
      .add(SAME_DAY_BOOKING_LEAD_TIME_HOURS, "hours")
      .startOf("minute");

    if (pickupAt.isBefore(earliestPickupAt)) {
      return "pickup_time must be at least 12 hours from now for today's airport transfer.";
    }
  }

  if (!scheduleSlot.start_time || !scheduleSlot.end_time) {
    return null;
  }

  const startsAt = getTimeOnDate(date, scheduleSlot.start_time);
  const endsAt = getTimeOnDate(date, scheduleSlot.end_time);

  if (pickupAt.isBefore(startsAt) || !pickupAt.isBefore(endsAt)) {
    return "pickup_time is outside the available service hours.";
  }

  return null;
};

const buildTransferBooking = (payload) => ({
  travel_date: payload.date,
  guests: payload.guests,
  quantity: payload.quantity,
  transfer_type: payload.transfer_type,
  pickup_location: getLocationSnapshot(payload.pickup_location),
  drop_location: getLocationSnapshot(payload.drop_location),
  pickup_time: payload.pickup_time,
});

const checkAirportTransfer = async ({
  product,
  location,
  payload,
  estimateId,
}) => {
  const today = moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

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

  // Pickup/drop haven't been selected yet (e.g. the initial availability
  // check fired on page load, before the user has interacted with the
  // transfer_type field). Nothing to quote yet - ask for a selection
  // instead of erroring out. Still return `data` (product/bookingTemplate)
  // so the frontend can render the transfer_type field and its location
  // pickers; without this the page has no way to let the user select
  // anything in the first place.
  if (payload.pickup_location == null || payload.drop_location == null) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Please select a pickup and drop location to continue.",
      data: buildBookingQuote({
        product,
        location,
        booking: buildTransferBooking(payload),
      }),
    };
  }

  const booking = buildTransferBooking(payload);
  const availability = await getAvailableVendorForProduct({
    productId: product.id,
    locationId: location.id,
    date: payload.date,
    guests: payload.quantity,
    ignoreSameDaySlotStartTime: true,
  });

  if (!availability) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Airport transfer is not available for the selected date.",
      data: buildBookingQuote({ product, location, booking }),
    };
  }

  const scheduleSlot = availability.slots[0];
  const pickupTimeError = getPickupTimeError({
    date: payload.date,
    pickupTime: payload.pickup_time,
    scheduleSlot,
  });

  if (pickupTimeError) {
    return {
      status: 200,
      success: true,
      available: false,
      message: pickupTimeError,
      data: buildBookingQuote({ product, location, booking }),
    };
  }

  const maxBookablePerBooking = getEffectiveMaxBookable({
    vendorProduct: availability.vendorProduct,
    scheduleSlot,
  });

  if (payload.quantity > maxBookablePerBooking) {
    return {
      status: 200,
      success: true,
      available: false,
      message: "Airport transfer is not available for the selected quantity.",
      data: buildBookingQuote({ product, location, booking }),
    };
  }

  const unitPrice = Number(
    scheduleSlot.price ?? availability.vendorProduct.base_price,
  );
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
    availability: {
      inventory: {
        available: scheduleSlot.available,
        max_bookable_per_booking: maxBookablePerBooking,
      },
    },
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

module.exports = {
  checkAirportTransfer,
};
