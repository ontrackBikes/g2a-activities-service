const Joi = require("joi");

const createProductTagSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(100)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .required(),

  icon: Joi.string()
    .trim()
    .max(100)
    .allow("", null),

  color: Joi.string()
    .trim()
    .max(30)
    .allow("", null),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductTagSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(100),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(100),

  icon: Joi.string()
    .trim()
    .max(100)
    .allow("", null),

  color: Joi.string()
    .trim()
    .max(30)
    .allow("", null),

  sort_order: Joi.number()
    .integer()
    .min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductTagSchema,
  updateProductTagSchema,
};