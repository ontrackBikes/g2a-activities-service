const moment = require("moment-timezone");
const { Op } = require("sequelize");

const { getAvailableVendorForProduct } = require("./availableVendor.service");
const buildBookingQuote = require("./buildBookingQuote");
const { saveBookingEstimate } = require("./createBookingEstimate.service");
const { calculateDistance } = require("../googleMaps.service");
const {
  VendorProductDistanceTier,
  VendorScheduleSlotDistanceTier,
} = require("../../models");

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
      latitude: location.lat ?? null,
      longitude: location.lng ?? null,
      place_types: location.place_types || [],
    };
  }

  const configuredLocation = locations.find(({ id }) => id === location);

  return configuredLocation
    ? {
        id: configuredLocation.id,
        name: configuredLocation.name,
        type: "configured",
        address: configuredLocation.address,
        latitude: configuredLocation.lat ?? null,
        longitude: configuredLocation.lng ?? null,
        place_types: configuredLocation.place_types || [],
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

  let unitPrice;
  let distanceKm = null;
  let durationMinutes = null;

  if (availability.vendorProduct.pricing_type === "KM_BASED") {
    const pickupCoords = booking.pickup_location;
    const dropCoords = booking.drop_location;

    if (
      pickupCoords?.latitude == null ||
      pickupCoords?.longitude == null ||
      dropCoords?.latitude == null ||
      dropCoords?.longitude == null
    ) {
      return {
        status: 200,
        success: true,
        available: false,
        message:
          "Distance-based pricing requires coordinates for both pickup and drop locations.",
        data: buildBookingQuote({
          product,
          location,
          booking,
          availability: availabilityDetails,
        }),
      };
    }

    const distanceResult = await calculateDistance({
      originLat: pickupCoords.latitude,
      originLng: pickupCoords.longitude,
      destinationLat: dropCoords.latitude,
      destinationLng: dropCoords.longitude,
    });

    if (!distanceResult.success) {
      return {
        status: 200,
        success: true,
        available: false,
        message: distanceResult.message,
        data: buildBookingQuote({
          product,
          location,
          booking,
          availability: availabilityDetails,
        }),
      };
    }

    distanceKm = distanceResult.data.distance_km;
    durationMinutes = distanceResult.data.duration_minutes;

    let tier = await VendorScheduleSlotDistanceTier.findOne({
      where: {
        vendor_schedule_slot_id: scheduleSlot.id,
        min_distance_km: { [Op.lt]: distanceKm },
      },
      order: [["min_distance_km", "DESC"]],
    });

    if (!tier && scheduleSlot.allow_sync_updates) {
      tier = await VendorProductDistanceTier.findOne({
        where: {
          vendor_product_id: availability.vendorProduct.id,
          active: true,
          min_distance_km: { [Op.lt]: distanceKm },
        },
        order: [["min_distance_km", "DESC"]],
      });
    }

    unitPrice = Number(tier ? tier.price : availability.vendorProduct.base_price);
  } else {
    unitPrice = Number(scheduleSlot.price ?? availability.vendorProduct.base_price);
  }

  const subtotal = unitPrice * payload.quantity;
  const quotation = buildBookingQuote({
    product,
    location,
    booking,
    pricing: {
      currency: "INR",
      pricing_type: availability.vendorProduct.pricing_type,
      unit_price: unitPrice,
      quantity: payload.quantity,
      subtotal,
      discount: 0,
      tax: 0,
      grand_total: subtotal,
      max_bookable_per_booking: maxBookablePerBooking,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
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
