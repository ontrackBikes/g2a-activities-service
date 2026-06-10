const Joi = require("joi");

const pricingSchema = Joi.object({
  currency: Joi.string(),
  basePrice: Joi.number().min(0),
});

const availabilitySchema = Joi.object({
  enabled: Joi.boolean(),
  minQuantity: Joi.number().integer().min(1),
  maxQuantity: Joi.number().integer().min(1),
  operatingDays: Joi.array().items(
    Joi.string().valid(
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN"
    )
  ),
  blackoutDates: Joi.array(),
  advanceBookingHours: Joi.number(),
});

module.exports = Joi.object({
  name: Joi.string(),

  slug: Joi.string(),

  code: Joi.string(),

  category: Joi.string(),

  short_description: Joi.string().allow(""),

  thumbnail_url: Joi.string().allow(""),

  active: Joi.boolean(),

  locationIds: Joi.array().items(Joi.number()),

  config: Joi.object({
    pricing: pricingSchema,
    availability: availabilitySchema,
    booking_schema: Joi.array(),
    recommendation_rules: Joi.array(),
    addons_rules: Joi.array(),
    source_rules: Joi.array(),
  }),

  content: Joi.object({
    sections: Joi.array(),
  }),
}).min(1);