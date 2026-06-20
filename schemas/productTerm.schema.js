const Joi = require("joi");

const createProductTermSchema = Joi.object({
  product_id: Joi.number()
    .integer()
    .positive()
    .required(),

  content: Joi.string()
    .trim()
    .required(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductTermSchema =
  Joi.object({
    content: Joi.string().trim(),

    sort_order: Joi.number()
      .integer()
      .min(0),

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createProductTermSchema,
  updateProductTermSchema,
};