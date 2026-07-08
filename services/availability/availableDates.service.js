const moment = require("moment-timezone");
const { Op } = require("sequelize");

const {
  Category,
  Location,
  Product,
  ProductType,
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../../models");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const MAX_RANGE_DAYS = 366;

class AvailableDatesError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AvailableDatesError";
    this.status = status;
  }
}

const normalizeDateRange = ({
  fromDate,
  toDate,
}) => {
  const today = moment()
    .tz(APP_TIMEZONE)
    .format("YYYY-MM-DD");

  const normalizedFromDate = fromDate || today;

  if (
    !moment(
      normalizedFromDate,
      "YYYY-MM-DD",
      true,
    ).isValid()
  ) {
    throw new AvailableDatesError(
      "from_date must be a valid calendar date",
    );
  }

  if (normalizedFromDate < today) {
    throw new AvailableDatesError(
      "from_date cannot be in the past",
    );
  }

  if (
    toDate &&
    !moment(toDate, "YYYY-MM-DD", true).isValid()
  ) {
    throw new AvailableDatesError(
      "to_date must be a valid calendar date",
    );
  }

  if (toDate && toDate < normalizedFromDate) {
    throw new AvailableDatesError(
      "to_date must be greater than or equal to from_date",
    );
  }

  if (toDate) {
    const rangeDays = moment(toDate).diff(
      moment(normalizedFromDate),
      "days",
    );

    if (rangeDays > MAX_RANGE_DAYS) {
      throw new AvailableDatesError(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }
  }

  return {
    fromDate: normalizedFromDate,
    toDate: toDate || null,
    today,
  };
};

const getProduct = async ({
  productSlug,
}) => {
  const productWhere = {
    slug: productSlug,
    active: true,
    booking_mode: "single_date",
  };

  const productTypeWhere = {
    active: true,
  };

  const categoryWhere = {
    active: true,
  };

  return Product.findOne({
    where: productWhere,
    attributes: [
      "id",
      "slug",
      "name",
      "booking_mode",
    ],
    include: [
      {
        model: ProductType,
        as: "productType",
        attributes: ["slug", "name"],
        required: true,
        where: productTypeWhere,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["slug", "name"],
            required: true,
            where: categoryWhere,
          },
        ],
      },
    ],
  });
};

const buildSlotWhere = ({ guests }) => ({
  status: "OPEN",
  available: {
    [Op.gte]: guests,
  },
  max_bookable_per_booking: {
    [Op.gte]: guests,
  },
});

const getAvailableDates = async ({
  productSlug,
  locationSlug = null,
  fromDate = null,
  toDate = null,
  guests = 1,
}) => {
  if (!productSlug) {
    throw new AvailableDatesError(
      "Product slug is required",
    );
  }

  const {
    fromDate: normalizedFromDate,
    toDate: normalizedToDate,
    today,
  } = normalizeDateRange({
    fromDate,
    toDate,
  });

  const product = await getProduct({
    productSlug,
  });

  if (!product) {
    throw new AvailableDatesError(
      "Product not found or does not support single-date availability",
      404,
    );
  }

  if (locationSlug) {
    const locationExists = await Location.findOne({
      attributes: ["slug"],
      where: {
        slug: locationSlug,
        active: true,
      },
    });

    if (!locationExists) {
      throw new AvailableDatesError(
        "Location not found",
        404,
      );
    }
  }

  const currentTime = moment()
    .tz(APP_TIMEZONE)
    .format("HH:mm:ss");

  const scheduleWhere = {
    schedule_date: {
      [Op.gte]: normalizedFromDate,
      ...(normalizedToDate
        ? {
            [Op.lte]: normalizedToDate,
          }
        : {}),
    },
    status: "OPEN",
  };

  const vendorProductWhere = {
    product_id: product.id,
    active: true,
  };

  const locationWhere = {
    active: true,
  };

  if (locationSlug) {
    locationWhere.slug = locationSlug;
  }

  const schedules = await VendorSchedule.findAll({
    attributes: ["schedule_date"],
    where: scheduleWhere,
    include: [
      {
        model: VendorProduct,
        as: "vendorProduct",
        attributes: [
          "product_id",
          "pricing_type",
        ],
        required: true,
        where: vendorProductWhere,
        include: [
          {
            model: Location,
            as: "location",
            attributes: ["slug", "name"],
            required: true,
            where: locationWhere,
          },
        ],
      },
      {
        model: VendorScheduleSlot,
        as: "slots",
        attributes: [
          "price",
          "available",
          "start_time",
          "max_bookable_per_booking",
        ],
        required: true,
        where: buildSlotWhere({ guests }),
      },
    ],
    order: [["schedule_date", "ASC"]],
  });

  const productJson = product.toJSON();
  const groupedProduct = {
    slug: productJson.slug,
    name: productJson.name,
    booking_mode: productJson.booking_mode,
    product_type: productJson.productType
      ? {
          slug: productJson.productType.slug,
          name: productJson.productType.name,
        }
      : null,
    category: productJson.productType?.category
      ? {
          slug: productJson.productType.category.slug,
          name: productJson.productType.category.name,
        }
      : null,
    locations: new Map(),
  };

  for (const schedule of schedules) {
    const vendorProduct = schedule.vendorProduct;

    if (!vendorProduct.location) {
      continue;
    }

    const location = vendorProduct.location;

    if (!groupedProduct.locations.has(location.slug)) {
      groupedProduct.locations.set(location.slug, {
        slug: location.slug,
        name: location.name,
        dates: new Map(),
      });
    }

    const locationGroup = groupedProduct.locations.get(
      location.slug,
    );
    const scheduleDate = schedule.schedule_date;
    const eligibleSlots = schedule.slots.filter(
      (slot) =>
        scheduleDate !== today ||
        !slot.start_time ||
        slot.start_time > currentTime,
    );

    if (!eligibleSlots.length) {
      continue;
    }

    const startingPrice = Math.min(
      ...eligibleSlots.map((slot) =>
        Number(slot.price),
      ),
    );
    const totalAvailable = eligibleSlots.reduce(
      (sum, slot) => sum + Number(slot.available || 0),
      0,
    );
    const slotsCount =
      vendorProduct.pricing_type === "SLOT"
        ? eligibleSlots.length
        : 0;
    const existing =
      locationGroup.dates.get(scheduleDate);

    if (
      !existing ||
      startingPrice < existing.starting_price
    ) {
      locationGroup.dates.set(scheduleDate, {
        date: scheduleDate,
        available: true,
        starting_price: startingPrice,
        pricing_type: vendorProduct.pricing_type,
        slots_count: slotsCount,
        inventory_available: totalAvailable,
      });
    }
  }

  const sanitizedProduct = {
    ...groupedProduct,
    locations: Array.from(
      groupedProduct.locations.values(),
    ).map((location) => ({
      ...location,
      dates: Array.from(location.dates.values()).sort(
        (first, second) =>
          first.date.localeCompare(second.date),
      ),
    })),
  };

  return {
    from_date: normalizedFromDate,
    to_date: normalizedToDate,
    guests,
    product: sanitizedProduct,
  };
};

module.exports = {
  AvailableDatesError,
  getAvailableDates,
};
