const { Op } = require("sequelize");
const moment = require("moment-timezone");

const {
  Product,
  Location,
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../models");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";
const MAX_RENTAL_DAYS = Math.max(
  Number.parseInt(
    process.env.BIKE_RENTAL_MAX_DAYS,
    10,
  ) || 90,
  1,
);

class BikeRentalAvailabilityError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "BikeRentalAvailabilityError";
    this.code = code;
    this.statusCode = 400;
  }
}

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) /
  100;

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    throw new BikeRentalAvailabilityError(
      `${fieldName} must be a positive integer`,
      `INVALID_${fieldName.toUpperCase()}`,
    );
  }

  return parsedValue;
};

const parseDate = (value, fieldName) => {
  const parsedDate = moment.tz(
    value,
    "YYYY-MM-DD",
    true,
    APP_TIMEZONE,
  );

  if (!parsedDate.isValid()) {
    throw new BikeRentalAvailabilityError(
      `${fieldName} must be a valid date in YYYY-MM-DD format`,
      `INVALID_${fieldName.toUpperCase()}`,
    );
  }

  return parsedDate.startOf("day");
};

const buildRentalDates = ({
  pickupDate,
  returnDate,
}) => {
  const start = parseDate(pickupDate, "pickupDate");
  const end = parseDate(returnDate, "returnDate");
  const today = moment()
    .tz(APP_TIMEZONE)
    .startOf("day");

  if (start.isBefore(today)) {
    throw new BikeRentalAvailabilityError(
      "pickupDate cannot be in the past",
      "START_DATE_IN_PAST",
    );
  }

  const rentalDays = end.diff(start, "days");

  if (rentalDays <= 0) {
    throw new BikeRentalAvailabilityError(
      "returnDate must be after pickupDate",
      "INVALID_DATE_RANGE",
    );
  }

  if (rentalDays > MAX_RENTAL_DAYS) {
    throw new BikeRentalAvailabilityError(
      `Rental period cannot exceed ${MAX_RENTAL_DAYS} days`,
      "RENTAL_PERIOD_TOO_LONG",
    );
  }

  const dates = Array.from(
    {
      length: rentalDays,
    },
    (_, index) =>
      start
        .clone()
        .add(index, "days")
        .format("YYYY-MM-DD"),
  );

  return {
    dates,
    rentalDays,
  };
};

const selectLowestPricedSlot = (slots) =>
  [...slots]
    .filter((slot) => {
      const price = Number(slot.price);

      return Number.isFinite(price) && price >= 0;
    })
    .sort((first, second) => {
      const priceDifference =
        Number(first.price) - Number(second.price);

      if (priceDifference !== 0) {
        return priceDifference;
      }

      return Number(first.id) - Number(second.id);
    })[0] || null;

const buildVendorCandidate = ({
  vendorProduct,
  requiredDates,
  guests,
}) => {
  const scheduleByDate = new Map(
    (vendorProduct.schedules || []).map(
      (schedule) => [
        String(schedule.schedule_date),
        schedule,
      ],
    ),
  );
  const dailyPricing = [];

  for (const date of requiredDates) {
    const schedule = scheduleByDate.get(date);

    if (!schedule) {
      return null;
    }

    const slot = selectLowestPricedSlot(
      schedule.slots || [],
    );

    if (!slot) {
      return null;
    }

    dailyPricing.push({
      date,
      unit_price: roundMoney(slot.price),
      schedule,
      slot,
    });
  }

  const unitPriceTotal = roundMoney(
    dailyPricing.reduce(
      (total, item) => total + item.unit_price,
      0,
    ),
  );

  return {
    vendorProduct,
    guests,
    rental_days: requiredDates.length,
    unit_price_total: unitPriceTotal,
    rental_total: roundMoney(
      unitPriceTotal * guests,
    ),
    daily_pricing: dailyPricing,
  };
};

const getAvailableBikeRentalVendor = async ({
  productId,
  locationId,
  pickupDate,
  returnDate,
  guests,
}) => {
  const resolvedProductId = parsePositiveInteger(
    productId,
    "productId",
  );
  const resolvedLocationId = parsePositiveInteger(
    locationId,
    "locationId",
  );
  const resolvedGuests = parsePositiveInteger(
    guests,
    "guests",
  );
  const {
    dates,
    rentalDays,
  } = buildRentalDates({
    pickupDate,
    returnDate,
  });

  const vendorProducts = await VendorProduct.findAll({
    where: {
      product_id: resolvedProductId,
      location_id: resolvedLocationId,
      active: true,
    },
    attributes: [
      "id",
      "vendor_id",
      "product_id",
      "location_id",
      "pricing_type",
      "base_price",
      "base_capacity",
    ],
    include: [
      {
        model: Product,
        as: "product",
        attributes: ["name", "slug"],
        required: true,
        where: {
          active: true,
        },
      },
      {
        model: Location,
        as: "location",
        attributes: ["name", "slug"],
        required: true,
        where: {
          active: true,
        },
      },
      {
        model: VendorSchedule,
        as: "schedules",
        attributes: [
          "id",
          "schedule_date",
          "status",
        ],
        required: true,
        where: {
          schedule_date: {
            [Op.in]: dates,
          },
          status: "OPEN",
        },
        include: [
          {
            model: VendorScheduleSlot,
            as: "slots",
            attributes: [
              "id",
              "slot_name",
              "price",
              "capacity",
              "booked",
              "available",
              "max_bookable_per_booking",
              "status",
            ],
            required: true,
            where: {
              status: "OPEN",
              available: {
                [Op.gte]: resolvedGuests,
              },
              max_bookable_per_booking: {
                [Op.gte]: resolvedGuests,
              },
            },
          },
        ],
      },
    ],
    order: [
      ["id", "ASC"],
      [
        {
          model: VendorSchedule,
          as: "schedules",
        },
        "schedule_date",
        "ASC",
      ],
      [
        {
          model: VendorSchedule,
          as: "schedules",
        },
        {
          model: VendorScheduleSlot,
          as: "slots",
        },
        "price",
        "ASC",
      ],
    ],
  });

  const candidates = vendorProducts
    .map((vendorProduct) =>
      buildVendorCandidate({
        vendorProduct,
        requiredDates: dates,
        guests: resolvedGuests,
      }),
    )
    .filter(Boolean);

  candidates.sort((first, second) => {
    const totalDifference =
      first.rental_total - second.rental_total;

    if (totalDifference !== 0) {
      return totalDifference;
    }

    const unitPriceDifference =
      first.unit_price_total -
      second.unit_price_total;

    if (unitPriceDifference !== 0) {
      return unitPriceDifference;
    }

    return (
      Number(first.vendorProduct.id) -
      Number(second.vendorProduct.id)
    );
  });

  const selectedVendor = candidates[0] || null;

  if (!selectedVendor) {
    return null;
  }

  return {
    ...selectedVendor,
    start_date: dates[0],
    end_date: returnDate,
    rental_days: rentalDays,
  };
};

module.exports = {
  BikeRentalAvailabilityError,
  getAvailableBikeRentalVendor,
};
