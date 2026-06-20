const Joi = require("joi");

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

    price: Joi.number().min(0),

    capacity: Joi.number()
      .integer()
      .min(0),

    available: Joi.number()
      .integer()
      .min(0),

    allow_sync_updates:
      Joi.boolean(),
  }).min(1);

module.exports = {
  createVendorSchedulesSchema,
  updateVendorScheduleSchema,
};