const moment = require("moment-timezone");

const airportTransferLocations = require("../../constants/airportTransferLocations");
const {
  getAvailableVendorForProduct,
} = require("./availableVendor.service");
const buildBookingQuote = require("./buildBookingQuote");
const {
  saveBookingEstimate,
} = require("./createBookingEstimate.service");

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
const AIRPORT_TRANSFER_PRICE = 450;

const getLocationSnapshot = (locationId) => {
  const location = airportTransferLocations.find(
    ({ id }) => id === locationId,
  );

  return {
    id: location.id,
    name: location.name,
    type: location.type,
    address: location.address,
  };
};

const getEffectiveMaxBookable = ({ vendorProduct, scheduleSlot }) =>
  Math.min(
    Number(vendorProduct.max_bookable_per_booking),
    Number(scheduleSlot.max_bookable_per_booking),
    Number(scheduleSlot.available),
  );

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

  const booking = buildTransferBooking(payload);
  const availability = await getAvailableVendorForProduct({
    productId: product.id,
    locationId: location.id,
    date: payload.date,
    guests: payload.quantity,
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

  const subtotal = AIRPORT_TRANSFER_PRICE * payload.quantity;
  const quotation = buildBookingQuote({
    product,
    location,
    booking,
    pricing: {
      currency: "INR",
      pricing_type: "FIXED",
      unit_price: AIRPORT_TRANSFER_PRICE,
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
