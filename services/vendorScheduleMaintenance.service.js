const moment = require("moment-timezone");

const sequelize = require("../config/sequelize");
const {
  VendorProduct,
  VendorProductSlot,
  VendorProductDistanceTier,
  VendorSchedule,
  VendorScheduleSlot,
  VendorScheduleSlotDistanceTier,
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

const buildSlotSnapshotFields = (templateSlot, vendorProduct) => ({
  slot_name: templateSlot.slot_name,
  start_time: templateSlot.start_time,
  end_time: templateSlot.end_time,
  max_bookable_per_booking: Number(
    templateSlot.max_bookable_per_booking ??
      vendorProduct.max_bookable_per_booking,
  ),
  duration_minutes: templateSlot.duration_minutes,
  priced_by: templateSlot.priced_by,
  is_preferred: templateSlot.is_preferred,
  is_start_time_only: templateSlot.is_start_time_only,
  is_for_non_indian: templateSlot.is_for_non_indian,
});

const distanceTiersMatchTemplate = (
  existingTiers,
  templateTiers,
) => {
  if (existingTiers.length !== templateTiers.length) {
    return false;
  }

  const sortByDistance = (a, b) =>
    Number(a.min_distance_km) - Number(b.min_distance_km);
  const sortedExisting = [...existingTiers].sort(sortByDistance);
  const sortedTemplate = [...templateTiers].sort(sortByDistance);

  return sortedExisting.every(
    (tier, index) =>
      Number(tier.min_distance_km) ===
        Number(sortedTemplate[index].min_distance_km) &&
      Number(tier.price) === Number(sortedTemplate[index].price),
  );
};

const createScheduleSlotsFromTemplate = async (
  { schedule, templateSlots, vendorProduct, templateDistanceTiers, status },
  transaction,
) => {
  if (!templateSlots.length) {
    return [];
  }

  const rows = templateSlots.map((slot) => ({
    vendor_schedule_id: schedule.id,
    vendor_product_slot_id: slot.id,
    price: slot.default_price,
    capacity: Number(slot.default_capacity),
    booked: 0,
    available: Number(slot.default_capacity),
    status,
    allow_sync_updates: true,
    ...buildSlotSnapshotFields(slot, vendorProduct),
  }));

  await VendorScheduleSlot.bulkCreate(rows, { transaction });

  const createdSlots = await VendorScheduleSlot.findAll({
    where: {
      vendor_schedule_id: schedule.id,
      vendor_product_slot_id: templateSlots.map((slot) => slot.id),
    },
    transaction,
  });

  if (
    vendorProduct.pricing_type === "KM_BASED" &&
    templateDistanceTiers.length
  ) {
    const distanceTierRows = createdSlots.flatMap((createdSlot) =>
      templateDistanceTiers.map((tier) => ({
        vendor_schedule_slot_id: createdSlot.id,
        min_distance_km: tier.min_distance_km,
        price: tier.price,
      })),
    );

    if (distanceTierRows.length) {
      await VendorScheduleSlotDistanceTier.bulkCreate(distanceTierRows, {
        transaction,
      });
    }
  }

  return createdSlots;
};

const maintainVendorProductSchedules = async (
  vendorProduct,
) => {
  const inventoryDays = Math.max(
    Number(vendorProduct.maintain_inventory_days) || 0,
    0,
  );

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
            slot_type: "TIME",
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
          slot_type: "TIME",
          active: true,
        },
        {
          transaction,
        },
      );

      templateSlots = [defaultSlot];
    }

    const templateDistanceTiers =
      vendorProduct.pricing_type === "KM_BASED"
        ? await VendorProductDistanceTier.findAll({
            where: {
              vendor_product_id: vendorProduct.id,
              active: true,
            },
            transaction,
          })
        : [];

    if (
      vendorProduct.pricing_type === "SLOT" &&
      templateSlots.length === 0
    ) {
      return {
        schedulesCreated: 0,
        slotsCreated: 0,
        slotsUpdated: 0,
        slotsClosed: 0,
        distanceTiersSynced: 0,
        hasTemplateSlots: false,
      };
    }

    const activeTemplateSlotIds = new Set(
      templateSlots.map((slot) => Number(slot.id)),
    );

    let schedulesCreated = 0;
    let slotsCreated = 0;

    // Phase 1: fill the maintain_inventory_days window by creating any
    // schedule dates that don't exist yet. This is the only thing
    // maintain_inventory_days gates - it never blocks syncing existing
    // schedules (see Phase 2 below).
    if (inventoryDays > 0) {
      const dates = buildInventoryDates(inventoryDays);

      for (const scheduleDate of dates) {
        const [schedule, created] =
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

        if (!created) {
          continue;
        }

        schedulesCreated += 1;

        const createdSlots = await createScheduleSlotsFromTemplate(
          {
            schedule,
            templateSlots,
            vendorProduct,
            templateDistanceTiers,
            status: "OPEN",
          },
          transaction,
        );

        slotsCreated += createdSlots.length;
      }
    }

    // Phase 2: sync price/timing/slot changes across every existing
    // schedule for this vendor product, regardless of date and
    // regardless of maintain_inventory_days. Timing/capacity/structural
    // changes always apply; allow_sync_updates only gates price (see the
    // per-slot loop below).
    let slotsUpdated = 0;
    let slotsClosed = 0;
    let distanceTiersSynced = 0;

    const slotIncludes = [
      {
        model: VendorScheduleSlot,
        as: "slots",
        required: false,
        include:
          vendorProduct.pricing_type === "KM_BASED"
            ? [
                {
                  model: VendorScheduleSlotDistanceTier,
                  as: "distanceTiers",
                  required: false,
                },
              ]
            : [],
      },
    ];

    const allSchedules = await VendorSchedule.findAll({
      where: {
        vendor_product_id: vendorProduct.id,
      },
      include: slotIncludes,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const schedule of allSchedules) {
      const existingSlotByTemplateId = new Map(
        (schedule.slots || []).map((slot) => [
          Number(slot.vendor_product_slot_id),
          slot,
        ]),
      );

      if (schedule.allow_sync_updates) {
        const missingTemplateSlots = templateSlots.filter(
          (slot) => !existingSlotByTemplateId.has(Number(slot.id)),
        );

        if (missingTemplateSlots.length) {
          const createdSlots = await createScheduleSlotsFromTemplate(
            {
              schedule,
              templateSlots: missingTemplateSlots,
              vendorProduct,
              templateDistanceTiers,
              status: schedule.status === "OPEN" ? "OPEN" : "CLOSED",
            },
            transaction,
          );

          slotsCreated += createdSlots.length;
        }
      }

      for (const templateSlot of templateSlots) {
        const existingSlot = existingSlotByTemplateId.get(
          Number(templateSlot.id),
        );

        if (!existingSlot) {
          continue;
        }

        // Timing, capacity/inventory, and other snapshot fields always
        // sync from the template. Only price (and, for KM_BASED,
        // distance-tier pricing) is gated by allow_sync_updates - when
        // it's off, that slot's price is treated as a manually pinned
        // special price and left untouched.
        const nextCapacity = Number(templateSlot.default_capacity);
        const nextAvailable = Math.max(
          nextCapacity - Number(existingSlot.booked),
          0,
        );

        const fields = {
          ...buildSlotSnapshotFields(templateSlot, vendorProduct),
          capacity: nextCapacity,
          available: nextAvailable,
        };

        if (existingSlot.allow_sync_updates) {
          fields.price = templateSlot.default_price;
        }

        existingSlot.set(fields);

        if (existingSlot.changed()) {
          await existingSlot.save({ transaction });

          slotsUpdated += 1;
        }

        if (
          vendorProduct.pricing_type === "KM_BASED" &&
          existingSlot.allow_sync_updates
        ) {
          const existingTiers = existingSlot.distanceTiers || [];

          if (
            !distanceTiersMatchTemplate(
              existingTiers,
              templateDistanceTiers,
            )
          ) {
            await VendorScheduleSlotDistanceTier.destroy({
              where: {
                vendor_schedule_slot_id: existingSlot.id,
              },
              transaction,
            });

            if (templateDistanceTiers.length) {
              await VendorScheduleSlotDistanceTier.bulkCreate(
                templateDistanceTiers.map((tier) => ({
                  vendor_schedule_slot_id: existingSlot.id,
                  min_distance_km: tier.min_distance_km,
                  price: tier.price,
                })),
                { transaction },
              );
            }

            distanceTiersSynced += 1;
          }
        }
      }

      // Removed-from-template slots are a structural change, not a price
      // change, so they're closed unconditionally - allow_sync_updates
      // only freezes price, it doesn't keep a dropped slot bookable.
      for (const existingSlot of schedule.slots || []) {
        if (
          activeTemplateSlotIds.has(
            Number(existingSlot.vendor_product_slot_id),
          ) ||
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
      distanceTiersSynced,
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
  distance_tiers_synced: 0,
  vendor_products_without_slots: 0,
});

const addResultToSummary = (summary, result) => {
  summary.schedules_created +=
    result.schedulesCreated;
  summary.slots_created += result.slotsCreated;
  summary.slots_updated += result.slotsUpdated;
  summary.slots_closed += result.slotsClosed;
  summary.distance_tiers_synced +=
    result.distanceTiersSynced || 0;

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
