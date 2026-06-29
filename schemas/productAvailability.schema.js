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

  pax: Joi.number()
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

    start_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base":
          "start_date must be in YYYY-MM-DD format",
      }),

    end_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base":
          "end_date must be in YYYY-MM-DD format",
      }),

    quantity: Joi.number()
      .integer()
      .min(1)
      .required(),
  });

module.exports = {
  checkProductAvailabilitySchema,
  checkBikeRentalAvailabilitySchema,
};
