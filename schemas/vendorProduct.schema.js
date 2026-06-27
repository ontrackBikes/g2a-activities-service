const Joi = require("joi");

const PRICING_TYPES = [
  "FIXED",
  "SLOT",
  "KM_BASED",
];

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
    .min(1)
    .default(90),

  active: Joi.boolean()
    .default(true),
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
        .min(1),

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createVendorProductSchema,
  updateVendorProductSchema,
};
