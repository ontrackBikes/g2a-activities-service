const Joi = require("joi");

const createHighlightSchema = Joi.object({
  title: Joi.string().trim().min(1).max(5000),
  content: Joi.string().trim().min(1).max(5000).required(),
  sort_order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateHighlightSchema = Joi.object({
  title: Joi.string().trim().min(1).max(5000),
  content: Joi.string().trim().min(1).max(5000),
  sort_order: Joi.number().integer().min(0),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createHighlightSchema,
  updateHighlightSchema,
};
