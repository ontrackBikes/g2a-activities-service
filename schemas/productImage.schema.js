const Joi = require("joi");

const createProductImageSchema = Joi.object({
  product_id: Joi.number()
    .integer()
    .positive()
    .required(),

  image_url: Joi.string()
    .required(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductImageSchema = Joi.object({
  image_url: Joi.string(),

  sort_order: Joi.number()
    .integer()
    .min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductImageSchema,
  updateProductImageSchema,
};