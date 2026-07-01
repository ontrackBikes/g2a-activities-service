const Joi = require("joi");

const createVendorProductSlotSchema =
  Joi.object({
    slot_name: Joi.string()
      .trim()
      .max(100)
      .required(),

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

    active: Joi.boolean()
      .default(true),
  });

const updateVendorProductSlotSchema =
  Joi.object({
    slot_name: Joi.string()
      .trim()
      .max(100),

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

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createVendorProductSlotSchema,
  updateVendorProductSlotSchema,
};