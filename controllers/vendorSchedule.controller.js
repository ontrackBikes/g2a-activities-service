const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");

const {
  VendorProduct,
  VendorProductSlot,
  VendorSchedule,
  VendorScheduleSlot,
} = require("../models");

const {
  createVendorSchedulesSchema,
  updateVendorScheduleSchema,
  updateVendorScheduleSlotSchema,
} = require("../schemas/vendorSchedule.schema");

const moment = require("moment");

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
        await VendorScheduleSlot.create(
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

module.exports = {
  createVendorSchedules,
  getVendorSchedules,
  getVendorSchedule,
  updateVendorSchedule,
  updateVendorScheduleSlot,
  deleteVendorSchedule,
  getVendorProductCalendar,
};
