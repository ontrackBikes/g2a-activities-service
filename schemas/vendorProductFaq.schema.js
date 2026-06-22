const Joi = require("joi");

const createFaqSchema = Joi.object({
  question: Joi.string().trim().min(3).max(500).required(),

  answer: Joi.string().trim().min(1).max(5000).required(),

  sort_order: Joi.number().integer().min(0).default(0),

  active: Joi.boolean().default(true),
});

const updateFaqSchema = Joi.object({
  question: Joi.string().trim().min(3).max(500),

  answer: Joi.string().trim().min(1).max(5000),

  sort_order: Joi.number().integer().min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createFaqSchema,
  updateFaqSchema,
};