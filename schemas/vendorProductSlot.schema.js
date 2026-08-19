const Joi = require("joi");

const createVendorProductSlotSchema =
  Joi.object({
    slot_name: Joi.string()
      .trim()
      .max(100)
      .required(),

    slot_type: Joi.string()
      .valid("TIME", "VARIANT", "time", "variant")
      .uppercase(),

    start_time: Joi.string()
      .allow(null, ""),

    end_time: Joi.string()
      .allow(null, ""),

    default_price: Joi.number()
      .min(0)
      .required(),

    default_capacity: Joi.number()
      .integer()
      .min(0)
      .required(),

    max_bookable_per_booking:
      Joi.number()
        .integer()
        .min(0)
        .required(),

    duration_minutes: Joi.number()
      .integer()
      .min(0)
      .allow(null),

    priced_by: Joi.string()
      .trim()
      .max(50)
      .allow(null, ""),

    is_preferred: Joi.boolean()
      .default(false),

    is_start_time_only: Joi.boolean()
      .default(false),

    is_for_non_indian: Joi.boolean()
      .default(false),

    active: Joi.boolean()
      .default(true),
  });

const updateVendorProductSlotSchema =
  Joi.object({
    slot_name: Joi.string()
      .trim()
      .max(100),

    slot_type: Joi.string()
      .valid("TIME", "VARIANT", "time", "variant")
      .uppercase(),

    start_time: Joi.string()
      .allow(null, ""),

    end_time: Joi.string()
      .allow(null, ""),

    default_price: Joi.number()
      .min(0),

    default_capacity: Joi.number()
      .integer()
      .min(0),

    max_bookable_per_booking:
      Joi.number()
        .integer()
        .min(0),

    duration_minutes: Joi.number()
      .integer()
      .min(0)
      .allow(null),

    priced_by: Joi.string()
      .trim()
      .max(50)
      .allow(null, ""),

    is_preferred: Joi.boolean(),

    is_start_time_only: Joi.boolean(),

    is_for_non_indian: Joi.boolean(),

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createVendorProductSlotSchema,
  updateVendorProductSlotSchema,
};
