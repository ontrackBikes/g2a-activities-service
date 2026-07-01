// services/booking/availableVendor.service.js

const { Op } = require("sequelize");

const {
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../../models");

const getAvailableVendorForProduct = async ({
  productId,
  locationId,
  date,
  guests,
}) => {
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
        },
      },

      {
        model: VendorScheduleSlot,
        as: "slots",

        required: false,

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

          pricing: {
            pricing_type: "SLOT",
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
      const displayPrice = Number(
        vendorProduct.base_price,
      );

      if (
        !selected ||
        displayPrice < selected.pricing.display_price
      ) {
        selected = {
          vendorProduct,

          pricing: {
            pricing_type: "FIXED",
            display_price: displayPrice,
          },

          slots: [],
        };
      }
    }
  }

  return selected;
};

module.exports = {
  getAvailableVendorForProduct,
};