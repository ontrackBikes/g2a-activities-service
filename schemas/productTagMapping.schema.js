const Joi = require("joi");

const createProductTagMappingSchema = Joi.object({
  product_id: Joi.number()
    .integer()
    .positive()
    .required(),

  tag_id: Joi.number()
    .integer()
    .positive()
    .required(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .default(0),
});

module.exports = {
  createProductTagMappingSchema
}