const moment = require("moment-timezone");

const sequelize = require("../config/sequelize");
const {
  VendorProduct,
  VendorProductSlot,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../models");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const buildInventoryDates = (numberOfDays) => {
  const startDate = moment().tz(APP_TIMEZONE).startOf("day");

  return Array.from(
    {
      length: numberOfDays,
    },
    (_, index) =>
      startDate
        .clone()
        .add(index, "days")
        .format("YYYY-MM-DD"),
  );
};

const maintainVendorProductSchedules = async (
  vendorProduct,
) => {
  const inventoryDays = Math.max(
    Number(vendorProduct.maintain_inventory_days) || 1,
    1,
  );
  const dates = buildInventoryDates(inventoryDays);

  return sequelize.transaction(async (transaction) => {
    let templateSlots = vendorProduct.slots || [];

    if (vendorProduct.pricing_type !== "SLOT") {
      const [defaultSlot] =
        await VendorProductSlot.findOrCreate({
          where: {
            vendor_product_id: vendorProduct.id,
            slot_name: "Default",
          },
          defaults: {
            start_time: null,
            end_time: null,
            default_price: vendorProduct.base_price,
            default_capacity:
              vendorProduct.base_capacity,
            sort_order: 0,
            active: true,
          },
          transaction,
        });

      await defaultSlot.update(
        {
          default_price: vendorProduct.base_price,
          default_capacity:
            vendorProduct.base_capacity,
          active: true,
        },
        {
          transaction,
        },
      );

      templateSlots = [defaultSlot];
    }

    const existingSchedules = await VendorSchedule.findAll({
      attributes: [
        "id",
        "schedule_date",
        "status",
        "allow_sync_updates",
      ],
      where: {
        vendor_product_id: vendorProduct.id,
        schedule_date: dates,
      },
      include: [
        {
          model: VendorScheduleSlot,
          as: "slots",
          attributes: [
            "id",
            "vendor_product_slot_id",
            "booked",
            "allow_sync_updates",
          ],
          required: false,
        },
      ],
      transaction,
    });

    const scheduleByDate = new Map(
      existingSchedules.map((schedule) => [
        String(schedule.schedule_date),
        schedule,
      ]),
    );

    let schedulesCreated = 0;
    let slotsCreated = 0;
    let slotsUpdated = 0;

    for (const scheduleDate of dates) {
      let schedule = scheduleByDate.get(scheduleDate);
      let created = false;

      if (!schedule) {
        [schedule, created] =
          await VendorSchedule.findOrCreate({
            where: {
              vendor_product_id: vendorProduct.id,
              schedule_date: scheduleDate,
            },
            defaults: {
              status: "OPEN",
              allow_sync_updates: true,
              sync_last_run_at: new Date(),
            },
            transaction,
          });
      }

      if (created) {
        schedulesCreated += 1;
      }

      if (
        !templateSlots.length ||
        (!created &&
          (schedule.status !== "OPEN" ||
            !schedule.allow_sync_updates))
      ) {
        continue;
      }

      const existingSlotByTemplateId = new Map(
        (schedule.slots || []).map((slot) => [
          Number(slot.vendor_product_slot_id),
          slot,
        ]),
      );
      const missingTemplateSlots = templateSlots.filter(
        (slot) =>
          !existingSlotByTemplateId.has(Number(slot.id)),
      );

      const scheduleSlots = missingTemplateSlots.map((slot) => ({
        vendor_schedule_id: schedule.id,
        vendor_product_slot_id: slot.id,
        slot_name: slot.slot_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: vendorProduct.base_price,
        capacity: vendorProduct.base_capacity,
        booked: 0,
        available: vendorProduct.base_capacity,
        max_bookable_per_booking:
          vendorProduct.max_bookable_per_booking,
        status: "OPEN",
        allow_sync_updates: true,
      }));

      if (scheduleSlots.length) {
        await VendorScheduleSlot.bulkCreate(scheduleSlots, {
          transaction,
        });

        slotsCreated += scheduleSlots.length;
      }

      for (const templateSlot of templateSlots) {
        const existingSlot =
          existingSlotByTemplateId.get(
            Number(templateSlot.id),
          );

        if (
          !existingSlot ||
          !existingSlot.allow_sync_updates
        ) {
          continue;
        }

        const booked = Number(existingSlot.booked);
        const baseCapacity = Number(
          vendorProduct.base_capacity,
        );
        const capacity = Math.max(
          baseCapacity,
          booked,
        );

        await VendorScheduleSlot.update(
          {
            price: vendorProduct.base_price,
            capacity,
            available: Math.max(
              capacity - booked,
              0,
            ),
            max_bookable_per_booking:
              vendorProduct.max_bookable_per_booking,
          },
          {
            where: {
              id: existingSlot.id,
            },
            transaction,
          },
        );

        slotsUpdated += 1;
      }
    }

    return {
      schedulesCreated,
      slotsCreated,
      slotsUpdated,
      hasTemplateSlots: templateSlots.length > 0,
    };
  });
};

const runVendorScheduleMaintenance = async () => {
  const vendorProducts = await VendorProduct.findAll({
    where: {
      active: true,
    },
    include: [
      {
        model: VendorProductSlot,
        as: "slots",
        required: false,
        where: {
          active: true,
        },
      },
    ],
    order: [["id", "ASC"]],
  });

  const summary = {
    vendor_products_checked: vendorProducts.length,
    schedules_created: 0,
    slots_created: 0,
    slots_updated: 0,
    vendor_products_without_slots: 0,
  };

  for (const vendorProduct of vendorProducts) {
    const result =
      await maintainVendorProductSchedules(vendorProduct);

    summary.schedules_created += result.schedulesCreated;
    summary.slots_created += result.slotsCreated;
    summary.slots_updated += result.slotsUpdated;

    if (!result.hasTemplateSlots) {
      summary.vendor_products_without_slots += 1;
    }
  }

  console.info(
    "[VendorScheduleMaintenance]",
    summary,
  );

  return summary;
};

module.exports = {
  runVendorScheduleMaintenance,
};
