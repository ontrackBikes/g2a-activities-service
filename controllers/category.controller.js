const Category = require("../models/category.model");
const Product = require("../models/product.model");
const ProductType = require("../models/productType.model");

const {
  createCategorySchema,
  updateCategorySchema,
} = require("../schemas/category.schema");

/**
 * Create Category
 */
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
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    console.error("[createCategory]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

/**
 * Get Categories
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    console.error("[getCategories]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/**
 * Get Category By Id
 */
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("[getCategoryById]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};


const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      where: {
        slug: req.params.slug,
        active: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productTypes = await ProductType.count({
      where: {
        category_id: category.id,
        active: true,
      },
    });

    const products = await Product.count({
      include: [
        {
          model: ProductType,
          as: "productType",
          required: true,
          where: {
            category_id: category.id,
            active: true,
          },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: {
        ...category.toJSON(),

        overview: {
          product_types: productTypes,
          products,
        },
      },
    });
  } catch (err) {
    console.error("[getCategoryBySlug]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

/**
 * Update Category
 */
const updateCategory = async (req, res) => {
  try {
    const { error, value } = updateCategorySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.update(value);

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    console.error("[updateCategory]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

/**
 * Delete Category
 */
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.update({
      active: false,
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    console.error("[deleteCategory]", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryBySlug
};
