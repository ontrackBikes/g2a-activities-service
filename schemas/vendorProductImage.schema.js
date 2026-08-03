const Joi = require("joi");

const createVendorProductImageSchema = Joi.object({
  image_url: Joi.string().trim().min(1).required(),
  sort_order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateVendorProductImageSchema = Joi.object({
  image_url: Joi.string().trim().min(1),
  sort_order: Joi.number().integer().min(0),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createVendorProductImageSchema,
  updateVendorProductImageSchema,
};
