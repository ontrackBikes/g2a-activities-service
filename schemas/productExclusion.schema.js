const Joi = require("joi");

const createProductExclusionSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),

  content: Joi.string().trim().min(1).max(5000).required(),

  sort_order: Joi.number().integer().min(0).default(0),

  active: Joi.boolean().default(true),
});

const updateProductExclusionSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000),

  sort_order: Joi.number().integer().min(0),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductExclusionSchema,
  updateProductExclusionSchema,
};