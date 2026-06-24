
const {
  createProductTagMappingSchema,
} = require("../schemas/productTagMapping.schema");

const {
  createProductTagSchema,
} = require("../schemas/productTag.schema");
const ProductTag = require("../models/productTag.model");
const { Product } = require("../models");
const ProductTagMapping = require("../models/productTagMapping.model");

const createProductTag = async (req, res) => {
  try {
    const { error, value } =
      createProductTagSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const tag = await ProductTag.create(value);

    return res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (err) {
    console.error("[createProductTag]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create tag",
    });
  }
};

module.exports = {
  createProductTag
}

