const Joi = require("joi");

const createProductSchema = Joi.object({
  group_id: Joi.number().integer().positive().optional(),


  product_type_id: Joi.number().integer().positive().required(),

  featured: Joi.boolean().default(false),

  name: Joi.string().trim().max(255).required(),

  slug: Joi.string().trim().lowercase().max(255).required(),

  short_description: Joi.string().allow("", null),

  thumbnail_url: Joi.string().allow("", null),

  thumbnail_url_sm: Joi.string().allow("", null),

  sort_order: Joi.number().integer().min(0).default(0),
  booking_mode: Joi.string()
  .valid(
    "single_date",
    "date_range",
    "open",
  )
  .default("single_date"),

  pricing_mode: Joi.string()
    .valid("quantity", "guest")
    .default("guest"),

  active: Joi.boolean().default(true),
  booking_template_id: Joi.number().integer().positive().required(),
});

const updateProductSchema = Joi.object({
  group_id: Joi.number().integer().positive(),


  product_type_id: Joi.number().integer().positive(),

  name: Joi.string().trim().max(255),

  slug: Joi.string().trim().lowercase().max(255),

  short_description: Joi.string().allow("", null),

  thumbnail_url: Joi.string().allow("", null),

  thumbnail_url_sm: Joi.string().allow("", null),

  sort_order: Joi.number().integer().min(0),
  booking_mode: Joi.string().valid(
  "single_date",
  "date_range",
  "open",
),

  pricing_mode: Joi.string().valid("quantity", "guest"),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductSchema,
  updateProductSchema,
};
