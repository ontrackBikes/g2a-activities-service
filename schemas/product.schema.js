const Joi = require("joi");

const createProductSchema = Joi.object({
  group_id: Joi.number().integer().positive().optional(),

  category_id: Joi.number().integer().positive().required(),

  product_type_id: Joi.number().integer().positive().required(),

  featured: Joi.boolean().default(false),

  name: Joi.string().trim().max(255).required(),

  slug: Joi.string().trim().lowercase().max(255).required(),

  short_description: Joi.string().allow("", null),

  thumbnail_url: Joi.string().allow("", null),

  thumbnail_url_sm: Joi.string().allow("", null),

  sort_order: Joi.number().integer().min(0).default(0),

  active: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  group_id: Joi.number().integer().positive(),

  category_id: Joi.number().integer().positive(),

  product_type_id: Joi.number().integer().positive(),

  name: Joi.string().trim().max(255),

  slug: Joi.string().trim().lowercase().max(255),

  short_description: Joi.string().allow("", null),

  thumbnail_url: Joi.string().allow("", null),

  thumbnail_url_sm: Joi.string().allow("", null),

  sort_order: Joi.number().integer().min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductSchema,
  updateProductSchema,
};
