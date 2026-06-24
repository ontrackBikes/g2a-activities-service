const Category = require("../models/category.model");
const ProductType = require("../models/productType.model");

const {
  createProductTypeSchema,
  updateProductTypeSchema,
} = require("../schemas/productType.schema");

/**
 * Create Product Type
 */
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

    const productType = await ProductType.create(value);

    return res.status(201).json({
      success: true,
      data: productType,
    });
  } catch (err) {
    console.error("[createProductType]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create product type",
    });
  }
};

/**
 * Get Product Types
 */
const getProductTypes = async (req, res) => {
  try {
    const where = {};

    if (req.query.category_id) {
      where.category_id = req.query.category_id;
    }

    const productTypes = await ProductType.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      count: productTypes.length,
      data: productTypes,
    });
  } catch (err) {
    console.error("[getProductTypes]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product types",
    });
  }
};

/**
 * Get Product Type By Id
 */
const getProductTypeById = async (req, res) => {
  try {
    const productType = await ProductType.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Category,
            as: "category",
          },
        ],
      }
    );

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: productType,
    });
  } catch (err) {
    console.error("[getProductTypeById]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product type",
    });
  }
};

/**
 * Update Product Type
 */
const updateProductType = async (req, res) => {
  try {
    const { error, value } =
      updateProductTypeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const productType = await ProductType.findByPk(
      req.params.id
    );

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    if (value.category_id) {
      const category = await Category.findByPk(
        value.category_id
      );

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    await productType.update(value);

    return res.status(200).json({
      success: true,
      data: productType,
    });
  } catch (err) {
    console.error("[updateProductType]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update product type",
    });
  }
};

/**
 * Delete Product Type
 */
const deleteProductType = async (req, res) => {
  try {
    const productType = await ProductType.findByPk(
      req.params.id
    );

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    await productType.update({
      active: false,
    });

    return res.status(200).json({
      success: true,
      message: "Product type deleted successfully",
    });
  } catch (err) {
    console.error("[deleteProductType]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product type",
    });
  }
};

module.exports = {
  createProductType,
  getProductTypes,
  getProductTypeById,
  updateProductType,
  deleteProductType,
};