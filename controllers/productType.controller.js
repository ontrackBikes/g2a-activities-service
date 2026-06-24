const Category = require("../models/category.model");
const ProductType = require("../models/productType.model");
const { createProductTypeSchema } = require("../schemas/productType.schema");

const createProductType = async (req, res) => {
  try {
    const { error, value } =
      createProductTypeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const category = await Category.findByPk(
      value.category_id
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const type = await ProductType.create(value);

    return res.status(201).json({
      success: true,
      data: type,
    });
  } catch (err) {
    console.error("[createProductType]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create product type",
    });
  }
};
module.exports = {
  createProductType
}