const Joi = require("joi");

const checkSingleDateAvailabilitySchema = Joi.object({
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

  estimate_id: Joi.string(),
   selected_slot_token: Joi.string(),
});

const checkDateRangeAvailabilitySchema =
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
    
    estimate_id: Joi.string(),
    selected_slot_token: Joi.string(),
  });

const checkOpenAvailabilitySchema = Joi.object({
  location_slug: Joi.string()
    .trim()
    .lowercase()
    .max(100)
    .required(),

  guests: Joi.number()
    .integer()
    .min(1)
    .required(),
});

const availableDatesQuerySchema = Joi.object({
  location_slug: Joi.string()
    .trim()
    .lowercase()
    .max(100),

  from_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({
      "string.pattern.base":
        "from_date must be in YYYY-MM-DD format",
    }),

  to_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({
      "string.pattern.base":
        "to_date must be in YYYY-MM-DD format",
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(1),
});

module.exports = {
  checkSingleDateAvailabilitySchema,
  checkDateRangeAvailabilitySchema,
  checkOpenAvailabilitySchema,
  availableDatesQuerySchema,
};
