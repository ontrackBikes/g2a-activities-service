const Joi = require("joi");

const createProductCollectionProductSchema =
  Joi.object({
    collection_id: Joi.number()
      .integer()
      .positive()
      .required(),

    product_id: Joi.number()
      .integer()
      .positive()
      .required(),

    sort_order: Joi.number()
      .integer()
      .min(0)
      .default(0),
  });

module.exports = {
  createProductCollectionProductSchema,
};