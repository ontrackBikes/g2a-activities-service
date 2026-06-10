const Joi = require("joi");


const conditionRuleSchema = Joi.object({
  field: Joi.string()
    .valid(
      "day_of_week",
      "date",
      "location_id",
      "quantity",
      "customer_type",
      "source",
      "booking_date"
    )
    .required(),

  operator: Joi.string()
    .valid(
      "EQ",
      "NEQ",
      "GT",
      "GTE",
      "LT",
      "LTE",
      "IN",
      "NOT_IN",
      "BETWEEN"
    )
    .required(),

  value: Joi.any().required(),
});


const conditionsSchema = Joi.object({
  operator: Joi.string()
    .valid("AND", "OR")
    .default("AND"),

  rules: Joi.array()
    .items(conditionRuleSchema)
    .min(1)
    .required(),
});


const pricingActionSchema = Joi.object({
  type: Joi.string()
    .valid(
      "FIXED_PRICE",
      "PERCENTAGE",
      "AMOUNT"
    )
    .required(),

  value: Joi.number().required(),
});

const pricingOverrideSchema = Joi.object({
  id: Joi.string().required(),

  name: Joi.string().optional(),

  priority: Joi.number()
    .integer()
    .default(0),

  enabled: Joi.boolean()
    .default(true),

  valid_from: Joi.date()
    .optional(),

  valid_to: Joi.date()
    .optional(),

  conditions: conditionsSchema.required(),

  action: pricingActionSchema.required(),
});


const pricingSchema = Joi.object({
  currency: Joi.string()
    .default("INR"),

  basePrice: Joi.number()
    .min(0)
    .required(),

  overrides: Joi.array()
    .items(pricingOverrideSchema)
    .default([]),
});

const availabilitySchema = Joi.object({
  enabled: Joi.boolean()
    .default(true),

  minQuantity: Joi.number()
    .integer()
    .min(1)
    .default(1),

  maxQuantity: Joi.number()
    .integer()
    .min(1)
    .default(1),

  operatingDays: Joi.array()
    .items(
      Joi.string().valid(
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI",
        "SAT",
        "SUN"
      )
    )
    .default([]),

  blackoutDates: Joi.array().default([]),

  advanceBookingHours: Joi.number()
    .default(0),
});

const bookingFieldSchema = Joi.object({
  key: Joi.string().required(),

  label: Joi.string().required(),

  type: Joi.string()
    .valid(
      "text",
      "textarea",
      "number",
      "date",
      "datetime",
      "email",
      "phone",
      "select",
      "radio",
      "checkbox"
    )
    .required(),

  required: Joi.boolean().default(false),

  dataSource: Joi.string()
    .valid(
      "static",
      "locations",
      "products",
      "recommendations"
    )
    .optional(),

  options: Joi.array().optional(),
});

module.exports = Joi.object({
  name: Joi.string().required(),

  slug: Joi.string().required(),

  code: Joi.string().required(),

  product_type: Joi.string()
    .valid(
      "activity",
      "rental",
      "transfer",
      "other"
    )
    .required(),

  category: Joi.string().required(),

  short_description: Joi.string()
    .allow("")
    .optional(),

  thumbnail_url: Joi.string()
    .allow("")
    .optional(),

  active: Joi.boolean().default(true),

  locationIds: Joi.array()
    .items(Joi.number())
    .default([]),

  config: Joi.object({
    pricing: pricingSchema.required(),

    availability: availabilitySchema,

    booking_schema: Joi.array()
      .items(bookingFieldSchema)
      .default([]),

    recommendation_rules: Joi.array()
      .default([]),

    addons_rules: Joi.array()
      .default([]),

    source_rules: Joi.array()
      .default([]),
  }).required(),

  content: Joi.object({
    sections: Joi.array().default([]),
  }).default(),
});