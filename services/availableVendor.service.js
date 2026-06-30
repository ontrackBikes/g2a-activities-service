const { Op } = require("sequelize");
const moment = require("moment-timezone");

const {
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
  Location,
} = require("../models");

const {
  getVendorProductPrice,
} = require("./vendorProductPrice.service");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const getToday = () =>
  moment().tz(APP_TIMEZONE).format("YYYY-MM-DD");

const getAvailableSchedule = async ({
  vendorProduct,
  date,
  guests,
}) => {
  const scheduleWhere = {
    vendor_product_id: vendorProduct.id,
    status: "OPEN",
    schedule_date: date || {
      [Op.gte]: getToday(),
    },
  };

  const schedule = await VendorSchedule.findOne({
    where: scheduleWhere,
    include: [
      {
        model: VendorScheduleSlot,
        as: "slots",
        required: true,
        where: {
          status: "OPEN",
          available: {
            [Op.gte]: guests,
          },
          max_bookable_per_booking: {
            [Op.gte]: guests,
          },
        },
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
        const pricing = getVendorProductPrice(
          vendorProduct,
          slots,
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

module.exports = {
  getAvailableVendorForProduct,
  getAvailableVendorsForProducts,
};
