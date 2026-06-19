// schemas/pricingOverride.schema.js

const Joi = require("joi");

const conditionRuleSchema = Joi.object({
  field: Joi.string().required(),

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

module.exports = Joi.object({
  id: Joi.string().required(),

  name: Joi.string().required(),

  priority: Joi.number()
    .integer()
    .default(0),

  enabled: Joi.boolean()
    .default(true),

  valid_from: Joi.date().optional(),

  valid_to: Joi.date().optional(),

  conditions: Joi.object({
    operator: Joi.string()
      .valid("AND", "OR")
      .default("AND"),

    rules: Joi.array()
      .items(conditionRuleSchema)
      .min(1)
      .required(),
  }).required(),

  action: Joi.object({
    type: Joi.string()
      .valid(
        "FIXED_PRICE",
        "PERCENTAGE",
        "AMOUNT"
      )
      .required(),

    value: Joi.number()
      .required(),
  }).required(),
});