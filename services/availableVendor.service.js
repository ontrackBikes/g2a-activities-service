const { Op, QueryTypes } = require("sequelize");
const moment = require("moment-timezone");
const sequelize = require("../config/sequelize");

const {
  VendorProduct,
  Vendor,
  VendorSchedule,
  VendorScheduleSlot,
  VendorScheduleSlotDistanceTier,
  Location,
} = require("../models");

const {
  getVendorProductPrice,
} = require("./vendorProductPrice.service");
const {
  isBeforeLeadTime,
} = require("./bookingLeadTime.service");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const getToday = () =>
  moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

const filterEligibleSlots = ({ schedule, vendorProduct }) => {
  if (!schedule) {
    return schedule;
  }

  schedule.slots = (schedule.slots || []).filter(
    (slot) =>
      !isBeforeLeadTime({
        date: schedule.schedule_date,
        time: slot.end_time || slot.start_time || "00:00:00",
        minBookingLeadHours: vendorProduct.min_booking_lead_hours,
      }),
  );

  return schedule.slots.length ? schedule : null;
};

const getAvailableSchedule = async ({
  vendorProduct,
  date,
  guests,
}) => {
  const today = getToday();
  const scheduleWhere = {
    vendor_product_id: vendorProduct.id,
    status: "OPEN",
    schedule_date: date || today,
  };
  const slotWhere = {
    status: "OPEN",
    available: {
      [Op.gte]: guests,
    },
    max_bookable_per_booking: {
      [Op.gte]: guests,
    },
    min_bookable_per_booking: {
      [Op.lte]: guests,
    },
  };

  let schedule = await VendorSchedule.findOne({
    where: scheduleWhere,
    include: [
      {
        model: VendorScheduleSlot,
        as: "slots",
        required: true,
        where: slotWhere,
      },
    ],
    order: [
      ["schedule_date", "ASC"],
      [
        {
          model: VendorScheduleSlot,
          as: "slots",
        },
        "price",
        "ASC",
      ],
    ],
  });

  schedule = filterEligibleSlots({ schedule, vendorProduct });

  if (!schedule && !date) {
    const futureSlotWhere = {
      status: "OPEN",
      available: {
        [Op.gte]: guests,
      },
      max_bookable_per_booking: {
        [Op.gte]: guests,
      },
      min_bookable_per_booking: {
        [Op.lte]: guests,
      },
    };

    schedule = await VendorSchedule.findOne({
      where: {
        vendor_product_id: vendorProduct.id,
        status: "OPEN",
        schedule_date: {
          [Op.gt]: today,
        },
      },
      include: [
        {
          model: VendorScheduleSlot,
          as: "slots",
          required: true,
          where: futureSlotWhere,
        },
      ],
      order: [
        ["schedule_date", "ASC"],
        [
          {
            model: VendorScheduleSlot,
            as: "slots",
          },
          "price",
          "ASC",
        ],
      ],
    });

    schedule = filterEligibleSlots({ schedule, vendorProduct });
  }

  if (!schedule) {
    return null;
  }

  return schedule;
};

const getAvailableVendorForProduct = async ({
  productId,
  locationId,
  locationIds = [],
  locationSlug,
  locationSlugs = [],
  date,
  guests = 1,
}) => {
  const vendorWhere = {
    product_id: productId,
    active: true,
    min_bookable_per_booking: {
      [Op.lte]: guests,
    },
    max_bookable_per_booking: {
      [Op.gte]: guests,
    },
  };

  const resolvedLocationIds = [
    ...new Set(
      [locationId, ...locationIds]
        .filter(Boolean)
        .map(Number)
        .filter(Number.isInteger),
    ),
  ];

  if (resolvedLocationIds.length) {
    vendorWhere.location_id = {
      [Op.in]: resolvedLocationIds,
    };
  }

  const resolvedLocationSlugs = [
    ...new Set(
      [locationSlug, ...locationSlugs]
        .filter(Boolean)
        .map(String),
    ),
  ];

  const vendorProducts = await VendorProduct.findAll({
    where: vendorWhere,
    include: [
      {
        model: Vendor,
        as: "vendor",
        attributes: [],
        required: true,
        where: { active: true },
      },
      {
        model: Location,
        as: "location",
        attributes: ["name", "slug"],
        required: true,
        where: {
          active: true,
          ...(resolvedLocationSlugs.length
            ? {
                slug: {
                  [Op.in]: resolvedLocationSlugs,
                },
              }
            : {}),
        },
      },
    ],
    order: [["id", "ASC"]],
  });

  const candidates = (
    await Promise.all(
      vendorProducts.map(async (vendorProduct) => {
        const schedule = await getAvailableSchedule({
          vendorProduct,
          date,
          guests,
        });

        if (!schedule) {
          return null;
        }

        const slots = schedule.slots || [];

        const distanceTierPrices =
          vendorProduct.pricing_type === "KM_BASED" && slots.length
            ? (
                await VendorScheduleSlotDistanceTier.findAll({
                  where: {
                    vendor_schedule_slot_id: slots.map((slot) => slot.id),
                  },
                  attributes: ["price"],
                })
              ).map((tier) => tier.price)
            : [];

        const pricing = getVendorProductPrice(
          vendorProduct,
          slots,
          distanceTierPrices,
        );

        return {
          vendorProduct,
          schedule,
          slots,
          pricing,
          location: vendorProduct.location,
        };
      }),
    )
  ).filter(Boolean);

  candidates.sort((first, second) => {
    const priceDifference =
      first.pricing.display_price -
      second.pricing.display_price;

    if (priceDifference !== 0) {
      return priceDifference;
    }

    const basePriceDifference =
      first.pricing.base_price -
      second.pricing.base_price;

    if (basePriceDifference !== 0) {
      return basePriceDifference;
    }

    return (
      Number(first.vendorProduct.id) -
      Number(second.vendorProduct.id)
    );
  });

  return candidates[0] || null;
};

const getAvailableVendorsForProducts = async ({
  productIds,
  locationIds = [],
  locationSlugs = [],
  date,
  guests = 1,
  concurrency = 5,
}) => {
  const results = new Map();
  const queue = [...new Set(productIds)];
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const currentIndex = cursor;
      cursor += 1;
      const productId = queue[currentIndex];

      const availableVendor =
        await getAvailableVendorForProduct({
          productId,
          locationIds,
          locationSlugs,
          date,
          guests,
        });

      results.set(productId, availableVendor);
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, queue.length),
      },
      () => worker(),
    ),
  );

  return results;
};

const getAvailableVendorsForProductLocations = async ({
  productLocations,
  date,
  guests = 1,
  concurrency = 8,
}) => {
  const results = new Map();
  const queue = [
    ...new Map(
      productLocations.map(({ productId, locationId }) => [
        `${Number(productId)}:${Number(locationId)}`,
        {
          productId: Number(productId),
          locationId: Number(locationId),
        },
      ]),
    ).values(),
  ].filter(
    ({ productId, locationId }) =>
      Number.isInteger(productId) &&
      productId > 0 &&
      Number.isInteger(locationId) &&
      locationId > 0,
  );
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const currentIndex = cursor;
      cursor += 1;
      const { productId, locationId } =
        queue[currentIndex];
      const key = `${productId}:${locationId}`;
      const availableVendor =
        await getAvailableVendorForProduct({
          productId,
          locationId,
          date,
          guests,
        });

      results.set(key, availableVendor);
    }
  };

  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, queue.length),
      },
      () => worker(),
    ),
  );

  return results;
};

const getLowestUpcomingPricesForProductLocations = async ({
  productLocations,
  guests = 1,
}) => {
  const pairs = [
    ...new Map(
      productLocations.map(({ productId, locationId }) => [
        `${Number(productId)}:${Number(locationId)}`,
        {
          productId: Number(productId),
          locationId: Number(locationId),
        },
      ]),
    ).values(),
  ].filter(
    ({ productId, locationId }) =>
      Number.isInteger(productId) &&
      productId > 0 &&
      Number.isInteger(locationId) &&
      locationId > 0,
  );

  if (!pairs.length) {
    return new Map();
  }

  const now = moment().tz(APP_TIMEZONE);
  const rows = await sequelize.query(
    `
      SELECT
        vp.product_id,
        vp.location_id,
        vp.pricing_type,
        LEAST(
          vss.price,
          COALESCE(
            (
              SELECT MIN(vssdt.price)
              FROM vendor_schedule_slot_distance_tiers AS vssdt
              WHERE vssdt.vendor_schedule_slot_id = vss.id
            ),
            vss.price
          )
        ) AS effective_price
      FROM vendor_products AS vp
      INNER JOIN vendors AS v ON v.id = vp.vendor_id
      INNER JOIN locations AS l ON l.id = vp.location_id
      INNER JOIN vendor_schedules AS vs
        ON vs.vendor_product_id = vp.id
      INNER JOIN vendor_schedule_slots AS vss
        ON vss.vendor_schedule_id = vs.id
      WHERE vp.product_id IN (:productIds)
        AND vp.location_id IN (:locationIds)
        AND vp.active = 1
        AND vp.min_bookable_per_booking <= :guests
        AND vp.max_bookable_per_booking >= :guests
        AND v.active = 1
        AND l.active = 1
        AND vs.status = 'OPEN'
        AND vs.schedule_date >= :today
        AND vss.status = 'OPEN'
        AND vss.available >= :guests
        AND vss.max_bookable_per_booking >= :guests
        AND vss.min_bookable_per_booking <= :guests
        AND TIMESTAMP(vs.schedule_date, COALESCE(vss.end_time, vss.start_time, '00:00:00'))
          > DATE_ADD(:nowInstant, INTERVAL vp.min_booking_lead_hours HOUR)
      ORDER BY effective_price ASC, vs.schedule_date ASC, vp.id ASC, vss.id ASC
    `,
    {
      replacements: {
        productIds: [...new Set(pairs.map(({ productId }) => productId))],
        locationIds: [...new Set(pairs.map(({ locationId }) => locationId))],
        today: now.format("YYYY-MM-DD"),
        nowInstant: now.format("YYYY-MM-DD HH:mm:ss"),
        guests: Math.max(Number.parseInt(guests, 10) || 1, 1),
      },
      type: QueryTypes.SELECT,
    },
  );

  const prices = new Map();

  for (const row of rows) {
    const key = `${Number(row.product_id)}:${Number(row.location_id)}`;

    if (!prices.has(key)) {
      prices.set(key, {
        price_type: row.pricing_type,
        display_price: Number(row.effective_price),
      });
    }
  }

  return prices;
};

module.exports = {
  getAvailableVendorForProduct,
  getAvailableVendorsForProducts,
  getAvailableVendorsForProductLocations,
  getLowestUpcomingPricesForProductLocations,
};
