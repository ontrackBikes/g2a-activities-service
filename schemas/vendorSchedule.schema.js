const Joi = require("joi");

const timeSchema = Joi.string()
  .pattern(
    /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
  )
  .allow(null);

const scheduleSlotUpdateFields = {
  start_time: timeSchema,

  end_time: timeSchema,

  price: Joi.number()
    .min(0),

  capacity: Joi.number()
    .integer()
    .min(0),

  available: Joi.number()
    .integer()
    .min(0),

  max_bookable_per_booking:
    Joi.number()
      .integer()
      .min(1),

  status: Joi.string().valid(
    "OPEN",
    "CLOSED"
  ),

  allow_sync_updates:
    Joi.boolean(),
};

const scheduleSlotUpdateFieldNames =
  Object.keys(scheduleSlotUpdateFields);

const createVendorSchedulesSchema =
  Joi.object({
    dates: Joi.array()
      .items(
        Joi.date().iso().required()
      )
      .min(1)
      .required(),

    status: Joi.string()
      .valid(
        "OPEN",
        "CLOSED",
        "BLACKED_OUT"
      )
      .default("OPEN"),

    slots: Joi.array()
      .items(
        Joi.object({
          vendor_product_slot_id:
            Joi.number()
              .integer()
              .positive()
              .required(),

          price: Joi.number()
            .min(0)
            .required(),

          capacity: Joi.number()
            .integer()
            .min(0)
            .required(),

          available: Joi.number()
            .integer()
            .min(0)
            .required(),

          max_bookable_per_booking:
            Joi.number()
              .integer()
              .min(1)
              .required(),

          allow_sync_updates:
            Joi.boolean()
              .default(true),
        })
      )
      .min(1)
      .required(),
  });

const updateVendorScheduleSchema =
  Joi.object({
    status: Joi.string().valid(
      "OPEN",
      "CLOSED",
      "BLACKED_OUT"
    ),

    allow_sync_updates:
      Joi.boolean(),
  }).min(1);

const updateVendorScheduleSlotSchema =
  Joi.object(
    scheduleSlotUpdateFields,
  ).min(1);

const bulkUpdateVendorScheduleSlotsSchema =
  Joi.object({
    slots: Joi.array()
      .items(
        Joi.object({
          schedule_id: Joi.number()
            .integer()
            .positive()
            .required(),

          slot_id: Joi.number()
            .integer()
            .positive()
            .required(),

          ...scheduleSlotUpdateFields,
        }).or(...scheduleSlotUpdateFieldNames),
      )
      .min(1)
      .max(100)
      .required(),
  });

module.exports = {
  createVendorSchedulesSchema,
  updateVendorScheduleSchema,
  updateVendorScheduleSlotSchema,
  bulkUpdateVendorScheduleSlotsSchema,
};
