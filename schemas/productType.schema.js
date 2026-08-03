const Joi = require("joi");

const createProductTypeSchema = Joi.object({

  name: Joi.string()
    .trim()
    .max(100)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .required(),

    category_id: Joi.number()
  .integer()
  .positive()
  .required(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductTypeSchema = Joi.object({

  name: Joi.string()
    .trim()
    .max(100),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100),

  category_id: Joi.number()
  .integer()
  .positive()
  .required(),

  sort_order: Joi.number()
    .integer()
    .min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductTypeSchema,
  updateProductTypeSchema,
};