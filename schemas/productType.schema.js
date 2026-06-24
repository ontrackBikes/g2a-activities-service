const Joi = require("joi");

const createProductTypeSchema = Joi.object({
  category_id: Joi.number()
    .integer()
    .positive()
    .required(),

  name: Joi.string()
    .trim()
    .max(100)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .required(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductTypeSchema = Joi.object({
  category_id: Joi.number()
    .integer()
    .positive(),

  name: Joi.string()
    .trim()
    .max(100),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100),

  sort_order: Joi.number()
    .integer()
    .min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductTypeSchema,
  updateProductTypeSchema,
};