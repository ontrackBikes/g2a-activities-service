const Joi = require("joi");

const estimateId = Joi.string()
  .guid({
    version: ["uuidv4", "uuidv5"],
  })
  .optional();

const slotToken = Joi.string()
  .pattern(/^slot_[a-f0-9]{16}$/)
  .allow(null, "")
  .messages({
    "string.pattern.base": "Invalid slot token.",
  })
  .optional();

const time24Hour = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base":
      "pickup_time must be in HH:mm format",
  });

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

  estimate_id: estimateId,

  selected_slot_token: slotToken,
});

const checkDateRangeAvailabilitySchema = Joi.object({
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

  pickup_time: time24Hour.default("10:00"),

  drop_time: Joi.forbidden().messages({
    "any.unknown":
      "drop_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),

  return_time: Joi.forbidden().messages({
    "any.unknown":
      "return_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),

  guests: Joi.number()
    .integer()
    .min(1)
    .default(1),

  estimate_id: estimateId,

  selected_slot_token: slotToken,
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

  estimate_id: estimateId,
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
