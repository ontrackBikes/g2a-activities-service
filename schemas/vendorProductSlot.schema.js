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

    min_bookable_per_booking:
      Joi.number()
        .integer()
        .min(1)
        .default(1),

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

    nationality_restriction: Joi.string()
      .valid("ALL", "INDIAN_ONLY", "NON_INDIAN_ONLY")
      .default("ALL"),

    description: Joi.string()
      .trim()
      .max(1000)
      .allow(null, ""),

    active: Joi.boolean()
      .default(true),
  }).custom(validateBookingRange);

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

    min_bookable_per_booking:
      Joi.number()
        .integer()
        .min(1),

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

    nationality_restriction: Joi.string()
      .valid("ALL", "INDIAN_ONLY", "NON_INDIAN_ONLY"),

    description: Joi.string()
      .trim()
      .max(1000)
      .allow(null, ""),

    active: Joi.boolean(),
  })
    .custom(validateBookingRange)
    .min(1);

module.exports = {
  createVendorProductSlotSchema,
  updateVendorProductSlotSchema,
};
