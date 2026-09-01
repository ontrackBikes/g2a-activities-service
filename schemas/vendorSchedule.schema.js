const Joi = require("joi");

const validateBookingRange = (value, helpers) => {
  if (
    value.min_bookable_per_booking !== undefined &&
    value.max_bookable_per_booking !== undefined &&
    value.min_bookable_per_booking > value.max_bookable_per_booking
  ) {
    return helpers.message(
      "min_bookable_per_booking cannot exceed max_bookable_per_booking",
    );
  }

  return value;
};

const timeSchema = Joi.string()
  .pattern(
    /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
  )
  .allow(null);

const scheduleSlotUpdateFields = {
  slot_name: Joi.string()
    .trim()
    .max(100),

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

  min_bookable_per_booking:
    Joi.number()
      .integer()
      .min(1),

  max_bookable_per_booking:
    Joi.number()
      .integer()
      .min(0),

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

          min_bookable_per_booking:
            Joi.number()
              .integer()
              .min(1),

          max_bookable_per_booking:
            Joi.number()
              .integer()
              .min(0)
              .required(),

          allow_sync_updates:
            Joi.boolean()
              .default(true),
        }).custom(validateBookingRange)
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
  Joi.object(scheduleSlotUpdateFields)
    .custom(validateBookingRange)
    .min(1);

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
        })
          .custom(validateBookingRange)
          .or(...scheduleSlotUpdateFieldNames),
      )
      .min(1)
      .max(100)
      .required(),
  }).custom(validateBookingRange);

const createVendorScheduleSlotsForDatesSchema =
  Joi.object({
    dates: Joi.array()
      .items(
        Joi.string()
          .pattern(/^\d{4}-\d{2}-\d{2}$/)
          .required(),
      )
      .min(1)
      .max(90)
      .unique()
      .required(),

    vendor_product_slot_id:
      Joi.number()
        .integer()
        .positive()
        .required(),

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

    min_bookable_per_booking:
      Joi.number()
        .integer()
        .min(1),

    max_bookable_per_booking:
      Joi.number()
        .integer()
        .min(0),

    status: Joi.string()
      .valid("OPEN", "CLOSED")
      .default("OPEN"),
  }).custom(validateBookingRange);

const replaceScheduleSlotDistanceTiersSchema =
  Joi.object({
    tiers: Joi.array()
      .items(
        Joi.object({
          min_distance_km: Joi.number()
            .positive()
            .required(),

          price: Joi.number()
            .min(0)
            .required(),
        }),
      )
      .unique("min_distance_km")
      .required(),

    allow_sync_updates:
      Joi.boolean(),
  });

module.exports = {
  createVendorSchedulesSchema,
  updateVendorScheduleSchema,
  updateVendorScheduleSlotSchema,
  bulkUpdateVendorScheduleSlotsSchema,
  createVendorScheduleSlotsForDatesSchema,
  replaceScheduleSlotDistanceTiersSchema,
};
