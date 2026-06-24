
const ProductTag = require("../models/productTag.model");
const { Product } = require("../models");
const ProductTagMapping = require("../models/productTagMapping.model");
const { createProductTagMappingSchema } = require("../schemas/productTagMapping.schema");

const assignTagToProduct = async (req, res) => {
  try {
    const { error, value } =
      createProductTagMappingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product = await Product.findByPk(
      value.product_id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const tag = await ProductTag.findByPk(
      value.tag_id
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    const existing =
      await ProductTagMapping.findOne({
        where: {
          product_id: value.product_id,
          tag_id: value.tag_id,
        },
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Tag already assigned",
      });
    }

    const mapping =
      await ProductTagMapping.create(value);

    return res.status(201).json({
      success: true,
      data: mapping,
    });
  } catch (err) {
    console.error("[assignTagToProduct]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to assign tag",
    });
  }
};

module.exports = {
  assignTagToProduct
}