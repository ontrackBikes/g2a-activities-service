const Joi = require("joi");

const checkProductAvailabilitySchema = Joi.object({
  location_slug: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .required(),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base":
        "date must be in YYYY-MM-DD format",
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .required(),
});

const checkBikeRentalAvailabilitySchema =
  Joi.object({
    location_slug: Joi.string()
      .trim()
      .lowercase()
      .max(100)
      .required(),

    pickup_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base":
          "pickup_date must be in YYYY-MM-DD format",
      }),

    return_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base":
          "return_date must be in YYYY-MM-DD format",
      }),

    guests: Joi.number()
      .integer()
      .min(1)
      .default(1),
  });

module.exports = {
  checkProductAvailabilitySchema,
  checkBikeRentalAvailabilitySchema,
};
