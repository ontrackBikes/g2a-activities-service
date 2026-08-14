const Joi = require("joi");

const PRICING_TYPES = [
  "FIXED",
  "SLOT",
  "KM_BASED",
];

const timeSchema = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/)
  .messages({
    "string.pattern.base":
      "Time must use HH:mm:ss format",
  });

const validateTimeRange = (value, helpers) => {
  if (
    value.start_time &&
    value.end_time &&
    value.start_time >= value.end_time
  ) {
    return helpers.message(
      "end_time must be later than start_time",
    );
  }

  return value;
};

const createVendorProductSchema = Joi.object({
  vendor_id: Joi.number()
    .integer()
    .positive()
    .required(),

  product_id: Joi.number()
    .integer()
    .positive()
    .required(),

  location_id: Joi.number()
    .integer()
    .positive()
    .required(),

  pricing_type: Joi.string()
    .valid(...PRICING_TYPES)
    .required(),

  base_price: Joi.number()
    .min(0)
    .required(),

  base_capacity: Joi.number()
    .integer()
    .min(0)
    .default(0),

  max_bookable_per_booking: Joi.number()
    .integer()
    .min(1)
    .default(10),

  maintain_inventory_days: Joi.number()
    .integer()
    .min(0)
    .default(90),

  min_booking_lead_hours: Joi.number()
    .integer()
    .min(0)
    .default(0),

  start_time: Joi.when("pricing_type", {
    is: "FIXED",
    then: timeSchema.optional(),
    otherwise: Joi.forbidden(),
  }),

  end_time: Joi.when("pricing_type", {
    is: "FIXED",
    then: timeSchema.optional(),
    otherwise: Joi.forbidden(),
  }),

  active: Joi.boolean()
    .default(true),
})
  .and("start_time", "end_time")
  .custom(validateTimeRange)
  .messages({
    "object.and":
      "start_time and end_time must be provided together",
  });

const updateVendorProductSchema =
  Joi.object({
    pricing_type: Joi.string().valid(
      ...PRICING_TYPES
    ),

    base_price: Joi.number()
      .min(0),

    base_capacity: Joi.number()
      .integer()
      .min(0),

    max_bookable_per_booking:
      Joi.number()
        .integer()
        .min(1),

    maintain_inventory_days:
      Joi.number()
        .integer()
        .min(0),

    min_booking_lead_hours:
      Joi.number()
        .integer()
        .min(0),

    start_time: timeSchema,

    end_time: timeSchema,

    active: Joi.boolean(),
  })
    .and("start_time", "end_time")
    .custom(validateTimeRange)
    .min(1)
    .messages({
      "object.and":
        "start_time and end_time must be provided together",
    });

module.exports = {
  createVendorProductSchema,
  updateVendorProductSchema,
};
