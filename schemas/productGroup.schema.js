const Joi = require("joi");

const createProductGroupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(255)
    .required(),

  description: Joi.string()
    .allow("", null),

  image_url: Joi.string()
    .allow("", null),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),

  active: Joi.boolean()
    .default(true),
});

const updateProductGroupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(255),

  description: Joi.string()
    .allow("", null),

  image_url: Joi.string()
    .allow("", null),

  sort_order: Joi.number()
    .integer()
    .min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductGroupSchema,
  updateProductGroupSchema,
};