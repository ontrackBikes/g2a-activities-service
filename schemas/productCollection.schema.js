const Joi = require("joi");

const ENTITY_TYPES = [
  "global",
  "category",
  "product_type",
  "location",
];

const createProductCollectionSchema =
  Joi.object({
    name: Joi.string()
      .trim()
      .max(255)
      .required(),

    slug: Joi.string()
      .trim()
      .lowercase()
      .required(),

    description: Joi.string()
      .allow("", null),

    banner_url: Joi.string()
      .allow("", null),

    entity_type: Joi.string()
      .valid(...ENTITY_TYPES)
      .required(),

    entity_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    sort_order: Joi.number()
      .integer()
      .min(0)
      .default(0),

    active: Joi.boolean()
      .default(true),
  });

const updateProductCollectionSchema =
  Joi.object({
    name: Joi.string()
      .trim()
      .max(255),

    slug: Joi.string()
      .trim()
      .lowercase(),

    description: Joi.string()
      .allow("", null),

    banner_url: Joi.string()
      .allow("", null),

    entity_type: Joi.string().valid(
      ...ENTITY_TYPES
    ),

    entity_id: Joi.number()
      .integer()
      .positive()
      .allow(null),

    sort_order: Joi.number()
      .integer()
      .min(0),

    active: Joi.boolean(),
  }).min(1);

module.exports = {
  createProductCollectionSchema,
  updateProductCollectionSchema,
};