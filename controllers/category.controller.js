const Category = require("../models/category.model");
const { createCategorySchema } = require("../schemas/category.schema");

const createCategory = async (req, res) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const category = await Category.create(value);

    return res.status(201).json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("[createCategory]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

module.exports = {
  createCategory
}