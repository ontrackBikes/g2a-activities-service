// services/booking/availableVendor.service.js

const { Op } = require("sequelize");

const {
  VendorProduct,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../../models");
const {
  isBeforeLeadTime,
} = require("../bookingLeadTime.service");

const getAvailableVendorForProduct = async ({
  productId,
  locationId,
  date,
  guests,
  ignoreSameDaySlotStartTime = false,
}) => {
  const slotWhere = {
    status: "OPEN",
    available: {
      [Op.gte]: guests,
    },
    max_bookable_per_booking: {
      [Op.gte]: guests,
    },
  };

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

    const eligibleSlots = ignoreSameDaySlotStartTime
      ? schedule.slots
      : schedule.slots.filter(
          (slot) =>
            !isBeforeLeadTime({
              date,
              time: slot.end_time || slot.start_time || "00:00:00",
              minBookingLeadHours: vendorProduct.min_booking_lead_hours,
            }),
        );

    /**
     * SLOT pricing
     */

    if (vendorProduct.pricing_type === "SLOT") {
      if (!eligibleSlots.length) {
        continue;
      }

      const displayPrice = Number(
        eligibleSlots[0].price,
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

          slots: eligibleSlots,
        };
      }

      continue;
    }

    /**
     * FIXED pricing
     */

    if (vendorProduct.pricing_type === "FIXED") {
      if (!eligibleSlots.length) {
        continue;
      }

      const displayPrice = Number(
        eligibleSlots[0].price ||
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

          slots: eligibleSlots,
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
      if (!eligibleSlots.length) {
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

          slots: eligibleSlots,
        };
      }
    }
  }

  return selected;
};

module.exports = {
  getAvailableVendorForProduct,
};
