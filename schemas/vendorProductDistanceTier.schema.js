const Joi = require("joi");

const createVendorProductDistanceTierSchema =
  Joi.object({
    min_distance_km: Joi.number()
      .positive()
      .required(),

    price: Joi.number()
      .min(0)
      .required(),

    active: Joi.boolean()
      .default(true),
  });

const updateVendorProductDistanceTierSchema =
  Joi.object({
    min_distance_km: Joi.number()
      .positive(),

    price: Joi.number()
      .min(0),

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createVendorProductDistanceTierSchema,
  updateVendorProductDistanceTierSchema,
};
