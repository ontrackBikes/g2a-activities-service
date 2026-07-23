const Joi = require("joi");

const createTermSchema = Joi.object({
  title: Joi.string().trim().min(1).max(5000),
  content: Joi.string().trim().min(1).max(10000).required(),
  sort_order: Joi.number().integer().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateTermSchema = Joi.object({
  title: Joi.string().trim().min(1).max(5000),
  content: Joi.string().trim().min(1).max(10000),
  sort_order: Joi.number().integer().min(0),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createTermSchema,
  updateTermSchema,
};
