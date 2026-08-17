const Joi = require("joi");

const LOCATION_TYPES = [
  "island",
  "city",
  "jetty",
  "beach",
  "attraction",
  "other",
];

const createLocationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .max(255)
    .required(),

  image: Joi.string()
    .trim()
    .lowercase()
    .max(255)
    .required(),

  location_type: Joi.string()
    .valid(...LOCATION_TYPES)
    .required(),

  parent_location_id: Joi.number()
    .integer()
    .positive()
    .allow(null),

  area_id: Joi.number()
    .integer()
    .positive()
    .allow(null),

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

const updateLocationSchema =
  createLocationSchema.fork(
    ["name", "slug", "location_type"],
    (schema) => schema.optional()
  ).min(1);

const serviceAreaSchema = Joi.object({
  geojson: Joi.object().required(),
});

module.exports = {
  createLocationSchema,
  updateLocationSchema,
  serviceAreaSchema,
};