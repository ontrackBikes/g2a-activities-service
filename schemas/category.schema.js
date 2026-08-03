const Joi = require("joi");

const createCategorySchema = Joi.object({
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

const updateCategorySchema = Joi.object({
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
  createCategorySchema,
  updateCategorySchema,
};