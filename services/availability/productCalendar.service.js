const moment = require("moment-timezone");
const { Op } = require("sequelize");

const {
  Location,
  Product,
  ProductType,
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../../models");
const {
  isBeforeLeadTime,
} = require("../bookingLeadTime.service");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const PAGE_SIZE_MONTHS = 3;

class ProductCalendarError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ProductCalendarError";
    this.status = status;
  }
}

const getCalendarWindow = (page = 1) => {
  const today = moment()
    .tz(APP_TIMEZONE)
    .startOf("day");
  const fromDate = today
    .clone()
    .add((page - 1) * PAGE_SIZE_MONTHS, "months");
  const toDate = fromDate
    .clone()
    .add(PAGE_SIZE_MONTHS, "months")
    .subtract(1, "day");

  return {
    fromDate,
    toDate,
    fromDateStr: fromDate.format("YYYY-MM-DD"),
    toDateStr: toDate.format("YYYY-MM-DD"),
  };
};

// Used whenever we can't resolve real inventory (bad slug shape, unknown
// product/location) - the frontend still gets a calendar-shaped response
// instead of an error to handle, just with every date marked "unknown".
const buildUnknownCalendar = ({ page = 1 } = {}) => {
  const { fromDate, toDate, fromDateStr, toDateStr } =
    getCalendarWindow(page);

  const dates = [];
  const cursor = fromDate.clone();

  while (cursor.isSameOrBefore(toDate)) {
    dates.push({
      date: cursor.format("YYYY-MM-DD"),
      available: "unknown",
    });

    cursor.add(1, "day");
  }

  return {
    page,
    from_date: fromDateStr,
    to_date: toDateStr,
    product: null,
    location: null,
    dates,
  };
};

const getProductCalendar = async ({
  productSlug,
  locationSlug,
  page = 1,
  guests = 1,
  quantity = null,
}) => {
  const product = await Product.findOne({
    attributes: [
      "id",
      "slug",
      "name",
      "booking_mode",
      "pricing_mode",
    ],
    where: {
      slug: productSlug,
      active: true,
    },
    include: [
      {
        model: ProductType,
        as: "productType",
        attributes: [],
        required: true,
        where: { active: true },
      },
    ],
  });

  if (!product) {
    throw new ProductCalendarError(
      "Product not found",
      404,
    );
  }

  const location = await Location.findOne({
    attributes: ["id", "slug", "name"],
    where: {
      slug: locationSlug,
      active: true,
    },
  });

  if (!location) {
    throw new ProductCalendarError(
      "Location not found",
      404,
    );
  }

  const pricingQuantity =
    product.pricing_mode === "quantity"
      ? quantity || 1
      : guests;

  const { fromDate, toDate, fromDateStr, toDateStr } =
    getCalendarWindow(page);

  const schedules = await VendorSchedule.findAll({
    attributes: ["schedule_date"],
    where: {
      schedule_date: {
        [Op.between]: [fromDateStr, toDateStr],
      },
      status: "OPEN",
    },
    include: [
      {
        model: VendorProduct,
        as: "vendorProduct",
        attributes: ["min_booking_lead_hours"],
        required: true,
        where: {
          product_id: product.id,
          location_id: location.id,
          active: true,
        },
      },
      {
        model: VendorScheduleSlot,
        as: "slots",
        attributes: ["start_time", "end_time"],
        required: true,
        where: {
          status: "OPEN",
          available: {
            [Op.gte]: pricingQuantity,
          },
          max_bookable_per_booking: {
            [Op.gte]: pricingQuantity,
          },
        },
      },
    ],
    order: [["schedule_date", "ASC"]],
  });

  const availableDates = new Set();

  for (const schedule of schedules) {
    const scheduleDate =
      schedule.schedule_date instanceof Date
        ? schedule.schedule_date
            .toISOString()
            .split("T")[0]
        : String(schedule.schedule_date);

    const minBookingLeadHours =
      schedule.vendorProduct.min_booking_lead_hours;

    const hasEligibleSlot = schedule.slots.some(
      (slot) =>
        !isBeforeLeadTime({
          date: scheduleDate,
          time:
            slot.end_time ||
            slot.start_time ||
            "00:00:00",
          minBookingLeadHours,
        }),
    );

    if (hasEligibleSlot) {
      availableDates.add(scheduleDate);
    }
  }

  const dates = [];
  const cursor = fromDate.clone();

  while (cursor.isSameOrBefore(toDate)) {
    const dateStr = cursor.format("YYYY-MM-DD");

    dates.push({
      date: dateStr,
      available: availableDates.has(dateStr),
    });

    cursor.add(1, "day");
  }

  return {
    page,
    from_date: fromDateStr,
    to_date: toDateStr,
    product: {
      slug: product.slug,
      name: product.name,
      booking_mode: product.booking_mode,
    },
    location: {
      slug: location.slug,
      name: location.name,
    },
    dates,
  };
};

module.exports = {
  ProductCalendarError,
  getProductCalendar,
  buildUnknownCalendar,
};
