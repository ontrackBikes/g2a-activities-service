const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");

const {
  VendorProduct,
  VendorProductSlot,
  VendorProductDistanceTier,
  VendorSchedule,
  VendorScheduleSlot,
  VendorScheduleSlotDistanceTier,
} = require("../models");

const {
  createVendorSchedulesSchema,
  updateVendorScheduleSchema,
  updateVendorScheduleSlotSchema,
  bulkUpdateVendorScheduleSlotsSchema,
  createVendorScheduleSlotsForDatesSchema,
  replaceScheduleSlotDistanceTiersSchema,
} = require("../schemas/vendorSchedule.schema");

const moment = require("moment-timezone");
const {
  queueVendorProductScheduleSync,
} = require(
  "../queues/vendorSchedule/vendorSchedule.queue"
);

const createVendorSchedules = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } = createVendorSchedulesSchema.validate(req.body);

    if (error) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const vendorProduct = await VendorProduct.findByPk(req.params.id);

    if (!vendorProduct) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Vendor Product not found",
      });
    }

    const slotIds = value.slots.map((slot) => slot.vendor_product_slot_id);

    const templateSlots = await VendorProductSlot.findAll({
      where: {
        vendor_product_id: vendorProduct.id,
      },
    });

    const validSlotIds = templateSlots.map((slot) => slot.id);

    const invalidSlots = slotIds.filter((id) => !validSlotIds.includes(id));

    if (invalidSlots.length) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid slot ids supplied",
      });
    }

    const existingSchedules = await VendorSchedule.findAll({
      where: {
        vendor_product_id: vendorProduct.id,
        schedule_date: value.dates,
      },
    });

    if (existingSchedules.length) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: "Schedules already exist",

        existing_dates: existingSchedules.map(
          (schedule) => schedule.schedule_date,
        ),
      });
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

    let schedulesCreated = 0;
    let slotsCreated = 0;

    for (const date of value.dates) {
      const schedule = await VendorSchedule.create(
        {
          vendor_product_id: vendorProduct.id,

          schedule_date: date,

          status: value.status,

          allow_sync_updates: true,
        },
        { transaction },
      );

      schedulesCreated++;

      for (const slot of value.slots) {
        const createdSlot = await VendorScheduleSlot.create(
          {
            vendor_schedule_id: schedule.id,

            vendor_product_slot_id: slot.vendor_product_slot_id,

            slot_name: templateSlots.find(
              (s) => s.id === slot.vendor_product_slot_id,
            ).slot_name,

            start_time: templateSlots.find(
              (s) => s.id === slot.vendor_product_slot_id,
            ).start_time,

            end_time: templateSlots.find(
              (s) => s.id === slot.vendor_product_slot_id,
            ).end_time,

            price: slot.price,

            capacity: slot.capacity,

            booked: 0,

            available: slot.available,

            max_bookable_per_booking: slot.max_bookable_per_booking,

            status: value.status === "OPEN" ? "OPEN" : "CLOSED",

            allow_sync_updates: slot.allow_sync_updates,
          },
          { transaction },
        );

        slotsCreated++;

        if (templateDistanceTiers.length) {
          await VendorScheduleSlotDistanceTier.bulkCreate(
            templateDistanceTiers.map((tier) => ({
              vendor_schedule_slot_id: createdSlot.id,
              min_distance_km: tier.min_distance_km,
              price: tier.price,
            })),
            { transaction },
          );
        }
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Schedules created successfully",

      data: {
        schedules_created: schedulesCreated,

        slots_created: slotsCreated,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error("[VendorScheduleController] createVendorSchedules", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorSchedules = async (req, res) => {
  try {
    const schedules = await VendorSchedule.findAll({
      where: {
        vendor_product_id: req.params.id,
      },

      include: [
        {
          model: VendorScheduleSlot,
          as: "slots",
        },
      ],

      order: [["schedule_date", "ASC"]],
    });

    return res.json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorSchedule = async (req, res) => {
  try {
    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
      include: [
        {
          model: VendorScheduleSlot,
          as: "slots",
        },
      ],
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    return res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateVendorSchedule = async (req, res) => {
  try {
    const { error, value } = updateVendorScheduleSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    await schedule.update(value);

    return res.json({
      success: true,
      message: "Schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createVendorScheduleSlotsForDates = async (
  req,
  res,
) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } =
      createVendorScheduleSlotsForDatesSchema.validate(
        req.body,
      );

    if (error) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const vendorProduct =
      await VendorProduct.findOne({
        where: {
          id: req.params.id,
          active: true,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (!vendorProduct) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Active vendor product not found",
      });
    }

    const templateSlot =
      await VendorProductSlot.findOne({
        where: {
          id: value.vendor_product_slot_id,
          vendor_product_id:
            vendorProduct.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (!templateSlot) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Vendor product slot template not found",
      });
    }

    if (templateSlot.active) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Date-specific slots require an inactive template. Active templates are synchronized to every inventory date.",
      });
    }

    const appTimezone =
      process.env.APP_TIMEZONE ||
      "Asia/Kolkata";
    const today = moment()
      .tz(appTimezone)
      .startOf("day");
    const invalidDate = value.dates.find(
      (date) => {
        const parsedDate = moment.tz(
          date,
          "YYYY-MM-DD",
          true,
          appTimezone,
        );

        return (
          !parsedDate.isValid() ||
          parsedDate.isBefore(today)
        );
      },
    );

    if (invalidDate) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          `Date ${invalidDate} is invalid or in the past`,
      });
    }

    const schedules =
      await VendorSchedule.findAll({
        where: {
          vendor_product_id:
            vendorProduct.id,
          schedule_date: {
            [Op.in]: value.dates,
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    const scheduleByDate = new Map(
      schedules.map((schedule) => [
        String(schedule.schedule_date),
        schedule,
      ]),
    );
    const missingDates = value.dates.filter(
      (date) => !scheduleByDate.has(date),
    );

    if (missingDates.length) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Schedules do not exist for one or more selected dates",
        missing_dates: missingDates,
      });
    }

    const unavailableSchedules =
      schedules.filter(
        (schedule) =>
          schedule.status !== "OPEN",
      );

    if (unavailableSchedules.length) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "One or more selected schedules are not open",
        unavailable_dates:
          unavailableSchedules.map(
            (schedule) => ({
              date: String(
                schedule.schedule_date,
              ),
              status: schedule.status,
            }),
          ),
      });
    }

    const scheduleIds = schedules.map(
      (schedule) => schedule.id,
    );
    const existingSlots =
      await VendorScheduleSlot.findAll({
        attributes: [
          "id",
          "vendor_schedule_id",
        ],
        where: {
          vendor_schedule_id: {
            [Op.in]: scheduleIds,
          },
          vendor_product_slot_id:
            templateSlot.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

    if (existingSlots.length) {
      const dateByScheduleId = new Map(
        schedules.map((schedule) => [
          Number(schedule.id),
          String(schedule.schedule_date),
        ]),
      );
      const existingDates = existingSlots.map(
        (slot) =>
          dateByScheduleId.get(
            Number(slot.vendor_schedule_id),
          ),
      );

      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Slot already exists for one or more selected dates",
        existing_dates: existingDates,
      });
    }

    const capacity =
      value.capacity ??
      Number(templateSlot.default_capacity);
    const available =
      value.available ?? capacity;

    if (available > capacity) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "available cannot exceed capacity",
      });
    }

    const templateMaxBookable =
      Number(
        templateSlot.max_bookable_per_booking,
      ) ||
      Number(
        vendorProduct.max_bookable_per_booking,
      );
    const maxBookablePerBooking =
      value.max_bookable_per_booking ??
      templateMaxBookable;
    const startTime =
      value.start_time !== undefined
        ? value.start_time
        : templateSlot.start_time;
    const endTime =
      value.end_time !== undefined
        ? value.end_time
        : templateSlot.end_time;
    const price =
      value.price ??
      templateSlot.default_price;

    const createdSlots =
      await VendorScheduleSlot.bulkCreate(
        schedules.map((schedule) => ({
          vendor_schedule_id: schedule.id,
          vendor_product_slot_id:
            templateSlot.id,
          slot_name: templateSlot.slot_name,
          start_time: startTime,
          end_time: endTime,
          price,
          capacity,
          booked: 0,
          available,
          max_bookable_per_booking:
            maxBookablePerBooking,
          status: value.status,
          allow_sync_updates: false,
        })),
        {
          transaction,
        },
      );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message:
        "Date-specific schedule slots created successfully",
      data: {
        slots_created: createdSlots.length,
        dates: value.dates,
        slots: createdSlots,
      },
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      "[VendorScheduleController] createVendorScheduleSlotsForDates",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create date-specific schedule slots",
    });
  }
};

const updateVendorScheduleSlot = async (
  req,
  res
) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } =
      updateVendorScheduleSlotSchema.validate(
        req.body
      );

    if (error) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!schedule) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const slot = await VendorScheduleSlot.findOne({
      where: {
        id: req.params.slotId,
        vendor_schedule_id: schedule.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!slot) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Schedule slot not found",
      });
    }

    const nextCapacity =
      value.capacity ?? Number(slot.capacity);
    const booked = Number(slot.booked);

    if (nextCapacity < booked) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "capacity cannot be less than already booked inventory",
      });
    }

    const maximumAvailable =
      nextCapacity - booked;
    const nextAvailable =
      value.available ??
      (value.capacity !== undefined
        ? maximumAvailable
        : Number(slot.available));

    if (nextAvailable > maximumAvailable) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "available cannot exceed capacity minus booked inventory",
      });
    }

    const updates = {
      ...value,
      capacity: nextCapacity,
      available: nextAvailable,
      allow_sync_updates:
        value.allow_sync_updates ?? false,
    };

    await slot.update(updates, {
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message:
        "Schedule slot updated successfully",
      data: slot,
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "[VendorScheduleController] updateVendorScheduleSlot",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const bulkUpdateVendorScheduleSlots = async (
  req,
  res,
) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } =
      bulkUpdateVendorScheduleSlotsSchema.validate(
        req.body,
      );

    if (error) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const duplicateKeys = new Set();

    for (const item of value.slots) {
      const key =
        `${item.schedule_id}:${item.slot_id}`;

      if (duplicateKeys.has(key)) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Duplicate schedule and slot combination supplied",
        });
      }

      duplicateKeys.add(key);
    }

    const scheduleIds = [
      ...new Set(
        value.slots.map(
          (item) => item.schedule_id,
        ),
      ),
    ];

    const schedules = await VendorSchedule.findAll({
      attributes: ["id"],
      where: {
        id: {
          [Op.in]: scheduleIds,
        },
        vendor_product_id: req.params.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (schedules.length !== scheduleIds.length) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "One or more schedules were not found for this vendor product",
      });
    }

    const slotIds = value.slots.map(
      (item) => item.slot_id,
    );
    const slots = await VendorScheduleSlot.findAll({
      where: {
        id: {
          [Op.in]: slotIds,
        },
        vendor_schedule_id: {
          [Op.in]: scheduleIds,
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const slotMap = new Map(
      slots.map((slot) => [
        Number(slot.id),
        slot,
      ]),
    );
    const updatesToApply = [];

    for (const item of value.slots) {
      const slot = slotMap.get(
        Number(item.slot_id),
      );

      if (
        !slot ||
        Number(slot.vendor_schedule_id) !==
          Number(item.schedule_id)
      ) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message:
            `Schedule slot ${item.slot_id} was not found in schedule ${item.schedule_id}`,
        });
      }

      const {
        schedule_id,
        slot_id,
        ...requestedUpdates
      } = item;
      const nextCapacity =
        requestedUpdates.capacity ??
        Number(slot.capacity);
      const booked = Number(slot.booked);

      if (nextCapacity < booked) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            `Slot ${slot_id}: capacity cannot be less than already booked inventory`,
        });
      }

      const maximumAvailable =
        nextCapacity - booked;
      const nextAvailable =
        requestedUpdates.available ??
        (requestedUpdates.capacity !== undefined
          ? maximumAvailable
          : Number(slot.available));

      if (nextAvailable > maximumAvailable) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            `Slot ${slot_id}: available cannot exceed capacity minus booked inventory`,
        });
      }

      updatesToApply.push({
        slot,
        updates: {
          ...requestedUpdates,
          capacity: nextCapacity,
          available: nextAvailable,
          allow_sync_updates:
            requestedUpdates.allow_sync_updates ??
            false,
        },
      });
    }

    for (const item of updatesToApply) {
      await item.slot.update(
        item.updates,
        {
          transaction,
        },
      );
    }

    await transaction.commit();

    return res.json({
      success: true,
      message:
        "Schedule slots updated successfully",
      count: updatesToApply.length,
      data: updatesToApply.map(
        (item) => item.slot,
      ),
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "[VendorScheduleController] bulkUpdateVendorScheduleSlots",
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteVendorSchedule = async (req, res) => {
  try {
    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    await schedule.destroy();

    return res.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const getVendorProductCalendar = async (req, res) => {
  try {
    const vendorProduct = await VendorProduct.findByPk(req.params.id);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product not found",
      });
    }

    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Valid year and month are required",
      });
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    const startDate = `${year}-${String(month).padStart(
      2,
      "0"
    )}-01`;

    const endDate = `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(daysInMonth).padStart(2, "0")}`;

    const schedules = await VendorSchedule.findAll({
      where: {
        vendor_product_id: vendorProduct.id,
        schedule_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: VendorScheduleSlot,
          as: "slots",
          include:
            vendorProduct.pricing_type === "KM_BASED"
              ? [
                  {
                    model: VendorScheduleSlotDistanceTier,
                    as: "distanceTiers",
                  },
                ]
              : [],
        },
      ],
      order: [["schedule_date", "ASC"]],
    });

    const scheduleMap = {};

    schedules.forEach((schedule) => {
      const date =
        schedule.schedule_date instanceof Date
          ? schedule.schedule_date.toISOString().split("T")[0]
          : String(schedule.schedule_date);

      scheduleMap[date] = schedule;
    });

    const calendar = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;

      const schedule = scheduleMap[date];

      calendar.push({
        date,
        has_schedule: !!schedule,
        schedule: schedule || null,
      });
    }

    return res.json({
      success: true,
      year,
      month,
      total_days: daysInMonth,
      days: calendar,
    });
  } catch (error) {
    console.error(
      "[VendorScheduleController] getVendorProductCalendar",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const syncVendorProductSchedules = async (
  req,
  res,
) => {
  try {
    const vendorProduct =
      await VendorProduct.findOne({
        attributes: ["id"],
        where: {
          id: req.params.id
        },
      });
      // if (!vendorProduct.active) {}

      if(vendorProduct.active === false) {
        return res.status(404).json({
          success: false,
          message:
            "Active vendor product not found",
        });
      }
    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Active vendor product not found",
      });
    }

    const job =
      await queueVendorProductScheduleSync({
        vendorProductId: vendorProduct.id,
        trigger: "manual",
      });

    return res.status(202).json({
      success: true,
      message:
        "Vendor product schedule sync queued",
      data: {
        vendor_product_id:
          vendorProduct.id,
        job_id: job.id,
      },
    });
  } catch (error) {
    console.error(
      "[VendorScheduleController] syncVendorProductSchedules",
      error,
    );

    return res.status(503).json({
      success: false,
      message:
        "Unable to queue vendor product schedule sync",
    });
  }
};

const getScheduleSlotDistanceTiers = async (
  req,
  res
) => {
  try {
    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const slot = await VendorScheduleSlot.findOne({
      where: {
        id: req.params.slotId,
        vendor_schedule_id: schedule.id,
      },
      include: [
        {
          model: VendorScheduleSlotDistanceTier,
          as: "distanceTiers",
        },
      ],
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Schedule slot not found",
      });
    }

    return res.json({
      success: true,
      data: {
        allow_sync_updates: slot.allow_sync_updates,
        tiers: slot.distanceTiers,
      },
    });
  } catch (error) {
    console.error(
      "[VendorScheduleController] getScheduleSlotDistanceTiers",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const replaceScheduleSlotDistanceTiers = async (
  req,
  res
) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } =
      replaceScheduleSlotDistanceTiersSchema.validate(
        req.body
      );

    if (error) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const schedule = await VendorSchedule.findOne({
      where: {
        id: req.params.scheduleId,
        vendor_product_id: req.params.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!schedule) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const vendorProduct = await VendorProduct.findByPk(
      req.params.id,
      {
        transaction,
      }
    );

    if (
      !vendorProduct ||
      vendorProduct.pricing_type !== "KM_BASED"
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Distance tiers can only be set for KM_BASED pricing vendor products",
      });
    }

    const slot = await VendorScheduleSlot.findOne({
      where: {
        id: req.params.slotId,
        vendor_schedule_id: schedule.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!slot) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Schedule slot not found",
      });
    }

    await VendorScheduleSlotDistanceTier.destroy({
      where: {
        vendor_schedule_slot_id: slot.id,
      },
      transaction,
    });

    const tierRows = value.tiers.map((tier) => ({
      vendor_schedule_slot_id: slot.id,
      min_distance_km: tier.min_distance_km,
      price: tier.price,
    }));

    if (tierRows.length) {
      await VendorScheduleSlotDistanceTier.bulkCreate(
        tierRows,
        {
          transaction,
        }
      );
    }

    await slot.update(
      {
        allow_sync_updates:
          value.allow_sync_updates ?? false,
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    const tiers = await VendorScheduleSlotDistanceTier.findAll({
      where: {
        vendor_schedule_slot_id: slot.id,
      },
    });

    return res.json({
      success: true,
      message: "Schedule slot distance tiers updated successfully",
      data: {
        allow_sync_updates: slot.allow_sync_updates,
        tiers,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "[VendorScheduleController] replaceScheduleSlotDistanceTiers",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createVendorSchedules,
  createVendorScheduleSlotsForDates,
  getVendorSchedules,
  getVendorSchedule,
  updateVendorSchedule,
  updateVendorScheduleSlot,
  bulkUpdateVendorScheduleSlots,
  deleteVendorSchedule,
  getVendorProductCalendar,
  getScheduleSlotDistanceTiers,
  replaceScheduleSlotDistanceTiers,
  syncVendorProductSchedules,
};
