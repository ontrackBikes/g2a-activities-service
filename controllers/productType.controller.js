const Category = require("../models/category.model");
const ProductType = require("../models/productType.model");
const Product = require("../models/product.model");
const VendorProduct = require("../models/vendorProduct.model");
const Location = require("../models/location.model");
const { Op } = require("sequelize");

const {
  createProductTypeSchema,
  updateProductTypeSchema,
} = require("../schemas/productType.schema");

/**
 * Create Product Type
 */
const createProductType = async (req, res) => {
  try {
    const { error, value } = createProductTypeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const category = await Category.findByPk(value.category_id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const existing = await ProductType.findOne({
      where: {
        category_id: value.category_id,
        slug: value.slug,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Product type slug already exists in this category",
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
    const category_where = {};
    const include = [
      {
        model: Category,
        as: "category",
        where: category_where,
        attributes: {
          exclude: ["id"],
        },
      },
    ];

    if (req.query.category_id) {
      where.category_id = req.query.category_id;
    }
    if (req.query.category_slug) {
      category_where.slug = req.query.category_slug;
    }

    if (req.query.active !== undefined) {
      where.active = req.query.active === "true";
    }

    if (req.query.location_slug) {
      include.push({
        model: Product,
        as: "products",
        attributes: [],
        required: true,
        where: { active: true },
        include: [
          {
            model: VendorProduct,
            as: "vendorProducts",
            attributes: [],
            required: true,
            where: { active: true },
            include: [
              {
                model: Location,
                as: "location",
                attributes: [],
                required: true,
                where: {
                  slug: req.query.location_slug,
                  active: true,
                },
              },
            ],
          },
        ],
      });
    }

    const productTypes = await ProductType.findAll({
      where,
      distinct: true,
      attributes: {
        exclude: ["category_id"],
      },
      include,
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
    const productType = await ProductType.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "category",
        },
      ],
    });

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
    const { error, value } = updateProductTypeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const productType = await ProductType.findByPk(req.params.id);

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    if (value.category_id) {
      const category = await Category.findByPk(value.category_id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    if (value.slug || value.category_id) {
      const existing = await ProductType.findOne({
        where: {
          category_id: value.category_id || productType.category_id,
          slug: value.slug || productType.slug,
          id: {
            [Op.ne]: productType.id,
          },
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Product type slug already exists in this category",
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
    const productType = await ProductType.findByPk(req.params.id);

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
