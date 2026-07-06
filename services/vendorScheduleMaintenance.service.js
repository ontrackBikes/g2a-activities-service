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
            start_time: "09:00:00",
            end_time: "18:00:00",
            default_price: vendorProduct.base_price,
            default_capacity:
              vendorProduct.base_capacity,
            max_bookable_per_booking:
              vendorProduct.max_bookable_per_booking,
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
          max_bookable_per_booking:
            vendorProduct.max_bookable_per_booking,
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
            "status",
            "allow_sync_updates",
          ],
          required: false,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
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
    let slotsClosed = 0;
    const activeTemplateSlotIds = new Set(
      templateSlots.map((slot) =>
        Number(slot.id),
      ),
    );

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
        !created &&
        schedule.status !== "OPEN"
      ) {
        continue;
      }

      const existingSlotByTemplateId = new Map(
        (schedule.slots || []).map((slot) => [
          Number(slot.vendor_product_slot_id),
          slot,
        ]),
      );
      const missingTemplateSlots =
        schedule.allow_sync_updates
          ? templateSlots.filter(
              (slot) =>
                !existingSlotByTemplateId.has(
                  Number(slot.id),
                ),
            )
          : [];

      const scheduleSlots = missingTemplateSlots.map((slot) => ({
        vendor_schedule_id: schedule.id,
        vendor_product_slot_id: slot.id,
        slot_name: slot.slot_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.default_price,
        capacity: Number(slot.default_capacity),
        booked: 0,
        available: Number(slot.default_capacity),
        max_bookable_per_booking:
          Number(
            slot.max_bookable_per_booking ??
              vendorProduct.max_bookable_per_booking,
          ),
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

        if (!existingSlot) {
          continue;
        }

        await VendorScheduleSlot.update(
          {
            slot_name: templateSlot.slot_name,
            start_time: templateSlot.start_time,
            end_time: templateSlot.end_time,
            max_bookable_per_booking:
              Number(
                templateSlot.max_bookable_per_booking ??
                  vendorProduct.max_bookable_per_booking,
              ),
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

      for (const existingSlot of schedule.slots || []) {
        if (
          activeTemplateSlotIds.has(
            Number(
              existingSlot.vendor_product_slot_id,
            ),
          ) ||
          !existingSlot.allow_sync_updates ||
          existingSlot.status === "CLOSED"
        ) {
          continue;
        }

        await existingSlot.update(
          {
            status: "CLOSED",
          },
          {
            transaction,
          },
        );

        slotsClosed += 1;
      }

      await schedule.update(
        {
          sync_last_run_at: new Date(),
        },
        {
          transaction,
        },
      );
    }

    return {
      schedulesCreated,
      slotsCreated,
      slotsUpdated,
      slotsClosed,
      hasTemplateSlots: templateSlots.length > 0,
    };
  });
};

const getVendorProductForMaintenance = (
  vendorProductId,
) =>
  VendorProduct.findOne({
    where: {
      id: vendorProductId,
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
  });

const createSummary = (vendorProductsChecked = 0) => ({
  vendor_products_checked: vendorProductsChecked,
  schedules_created: 0,
  slots_created: 0,
  slots_updated: 0,
  slots_closed: 0,
  vendor_products_without_slots: 0,
});

const addResultToSummary = (summary, result) => {
  summary.schedules_created +=
    result.schedulesCreated;
  summary.slots_created += result.slotsCreated;
  summary.slots_updated += result.slotsUpdated;
  summary.slots_closed += result.slotsClosed;

  if (!result.hasTemplateSlots) {
    summary.vendor_products_without_slots += 1;
  }
};

const runVendorProductScheduleMaintenance = async (
  vendorProductId,
) => {
  const normalizedVendorProductId = Number(
    vendorProductId,
  );

  if (
    !Number.isInteger(normalizedVendorProductId) ||
    normalizedVendorProductId <= 0
  ) {
    throw new Error(
      "A valid vendor product id is required",
    );
  }

  const vendorProduct =
    await getVendorProductForMaintenance(
      normalizedVendorProductId,
    );
  const summary = createSummary(
    vendorProduct ? 1 : 0,
  );

  if (!vendorProduct) {
    return {
      ...summary,
      skipped: true,
      reason:
        "Active vendor product not found",
    };
  }

  const result =
    await maintainVendorProductSchedules(
      vendorProduct,
    );

  addResultToSummary(summary, result);

  console.info(
    "[VendorProductScheduleMaintenance]",
    {
      vendor_product_id:
        normalizedVendorProductId,
      ...summary,
    },
  );

  return summary;
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

  const summary = createSummary(
    vendorProducts.length,
  );

  for (const vendorProduct of vendorProducts) {
    const result =
      await maintainVendorProductSchedules(vendorProduct);

    addResultToSummary(summary, result);
  }

  console.info(
    "[VendorScheduleMaintenance]",
    summary,
  );

  return summary;
};

module.exports = {
  runVendorProductScheduleMaintenance,
  runVendorScheduleMaintenance,
};
