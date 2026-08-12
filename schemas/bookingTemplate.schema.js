const Joi = require("joi");

const fieldSchema = Joi.object({
  field: Joi.string().required(),

  label: Joi.string().allow("", null),

  description: Joi.string().trim().max(500).allow("", null),

  required: Joi.boolean().default(false),

  hidden: Joi.boolean().default(false),

  readonly: Joi.boolean().default(false),

  default_value: Joi.any(),

  config: Joi.object().default({}),

  visible: Joi.boolean().default(true),
});

const sectionSchema = Joi.object({
  section: Joi.string().required(),

  title: Joi.string().allow("", null),

  required: Joi.boolean().default(false),
  enabled: Joi.boolean().default(false),

  config: Joi.object().default({}),
  sort_order: Joi.number(),
});

const createBookingTemplateSchema = Joi.object({
  name: Joi.string().max(150).required(),

  slug: Joi.string().lowercase().trim().max(150).required(),

  description: Joi.string().allow("", null),

  availability_handler: Joi.string()
    .valid("standard", "airport_transfer", "cab_service")
    .default("standard"),

  product_page_schema: Joi.object({
    fields: Joi.array().items(fieldSchema).default([]),
  }).required(),

  booking_page_schema: Joi.object({
    sections: Joi.array().items(sectionSchema).default([]),
  }).required(),

  active: Joi.boolean().default(true),
});

const updateBookingTemplateSchema = Joi.object({
  name: Joi.string().max(150),

  slug: Joi.string().lowercase().trim().max(150),

  description: Joi.string().allow("", null),

  availability_handler: Joi.string().valid(
    "standard",
    "airport_transfer",
    "cab_service",
  ),

  product_page_schema: Joi.object({
    fields: Joi.array().items(fieldSchema),
  }),

  booking_page_schema: Joi.object({
    sections: Joi.array().items(sectionSchema),
  }),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createBookingTemplateSchema,
  updateBookingTemplateSchema,
};
