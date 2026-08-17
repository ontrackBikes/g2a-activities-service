const Joi = require("joi");

const createAreaSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(255)
    .required(),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .allow(null),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .allow(null),

  active: Joi.boolean()
    .default(true),

  geojson: Joi.object().allow(null),
});

const updateAreaSchema =
  createAreaSchema.fork(
    ["name", "slug"],
    (schema) => schema.optional()
  ).min(1);

const serviceAreaSchema = Joi.object({
  geojson: Joi.object().required(),
});

module.exports = {
  createAreaSchema,
  updateAreaSchema,
  serviceAreaSchema,
};
