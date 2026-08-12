// services/booking/availableVendor.service.js

const { Op } = require("sequelize");
const moment = require("moment-timezone");

const {
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../../models");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const getAvailableVendorForProduct = async ({
  productId,
  locationId,
  date,
  guests,
  ignoreSameDaySlotStartTime = false,
}) => {
  const now = moment().tz(APP_TIMEZONE);
  const today = now.format("YYYY-MM-DD");
  const currentTime = now.format("HH:mm:ss");
  const slotWhere = {
    status: "OPEN",
    available: {
      [Op.gte]: guests,
    },
    max_bookable_per_booking: {
      [Op.gte]: guests,
    },
  };

  if (date === today && !ignoreSameDaySlotStartTime) {
    slotWhere[Op.or] = [
      {
        start_time: null,
      },
      {
        start_time: {
          [Op.gt]: currentTime,
        },
      },
    ];
  }

  const schedules = await VendorSchedule.findAll({
    where: {
      schedule_date: date,
      status: "OPEN",
    },

    include: [
      {
        model: VendorProduct,
        as: "vendorProduct",

        required: true,

        where: {
          product_id: productId,
          location_id: locationId,
          active: true,
          max_bookable_per_booking: {
            [Op.gte]: guests,
          },
        },
      },

      {
        model: VendorScheduleSlot,
        as: "slots",

        required: true,

        where: slotWhere,
      },
    ],

    order: [
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

  if (!schedules.length) {
    return null;
  }

  /**
   * Find cheapest vendor.
   */

  let selected = null;

  for (const schedule of schedules) {
    const vendorProduct = schedule.vendorProduct;

    /**
     * SLOT pricing
     */

    if (vendorProduct.pricing_type === "SLOT") {
      if (!schedule.slots.length) {
        continue;
      }

      const displayPrice = Number(
        schedule.slots[0].price,
      );

      if (
        !selected ||
        displayPrice < selected.pricing.display_price
      ) {
        selected = {
          vendorProduct,
          schedule,

          pricing: {
            price_type: "SLOT",
            display_price: displayPrice,
          },

          slots: schedule.slots,
        };
      }

      continue;
    }

    /**
     * FIXED pricing
     */

    if (vendorProduct.pricing_type === "FIXED") {
      if (!schedule.slots.length) {
        continue;
      }

      const displayPrice = Number(
        schedule.slots[0].price ||
          vendorProduct.base_price,
      );

      if (
        !selected ||
        displayPrice < selected.pricing.display_price
      ) {
        selected = {
          vendorProduct,
          schedule,

          pricing: {
            price_type: "FIXED",
            display_price: displayPrice,
          },

          slots: schedule.slots,
        };
      }
    }

    /**
     * KM_BASED pricing
     *
     * Ranked by base_price alone (proxy, same as FIXED) —
     * the actual tiered fare depends on distance, which isn't
     * known yet at this stage.
     */

    if (vendorProduct.pricing_type === "KM_BASED") {
      if (!schedule.slots.length) {
        continue;
      }

      const displayPrice = Number(vendorProduct.base_price);

      if (
        !selected ||
        displayPrice < selected.pricing.display_price
      ) {
        selected = {
          vendorProduct,
          schedule,

          pricing: {
            price_type: "KM_BASED",
            display_price: displayPrice,
          },

          slots: schedule.slots,
        };
      }
    }
  }

  return selected;
};

module.exports = {
  getAvailableVendorForProduct,
};
