// schemas/location.schema.js
const Joi = require("joi");

module.exports = Joi.object({
  code: Joi.string()
    .max(50)
    .required(),

  name: Joi.string()
    .max(255)
    .required(),

  display_name: Joi.string()
    .max(255)
    .allow(null, "")
    .optional(),

  image_url: Joi.string()
    .uri()
    .allow(null, "")
    .optional(),

  slug: Joi.string()
    .max(255)
    .required(),

  type: Joi.string()
    .valid("island", "city", "beach", "attraction", "jetty", "other")
    .required(),

  parent_location_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional(),

  sort_order: Joi.number()
    .integer()
    .default(0),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .allow(null)
    .optional(),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .allow(null)
    .optional(),

  active: Joi.boolean()
    .default(true),
});