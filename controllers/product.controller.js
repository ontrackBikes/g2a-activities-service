const { Op } = require("sequelize");
const productSchema = require("../schemas/product.schema");
const { Product, ProductConfig, ProductContent } = require("../models");
const { parseError } = require("../services/error.service");

const getProducts = async (req, res) => {
  try {
    const {
      locationId,
      productType,
      status,
      search,
      category,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    // filters
    if (productType) where.product_type = productType;
    if (status !== undefined) where.active = status === "true";
    if (category) where.category = category;

    // search (name / slug)
    if (search) {
      where[require("sequelize").Op.or] = [
        { name: { [require("sequelize").Op.like]: `%${search}%` } },
        { slug: { [require("sequelize").Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const include = [
      {
        association: "config",
      },
      {
        association: "locations",
        through: { attributes: [] },
        ...(locationId ? { where: { id: locationId } } : {}),
      },
    ];

    const { rows, count } = await Product.findAndCountAll({
      where,
      include,
      limit: Number(limit),
      offset: Number(offset),
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("getProducts error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const createProduct = async (req, res) => {
  let transaction;
  try {
    // 1. VALIDATE FIRST
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((e) => e.message),
      });
    }

    // 2. SAFE DESTRUCTURE
    const { locationIds = [], config, content, ...productData } = value;

    transaction = await Product.sequelize.transaction();

    // 3. CREATE PRODUCT
    const product = await Product.create(productData, { transaction });

    // 4. CONFIG
    await ProductConfig.create(
      {
        product_id: product.id,
        ...config,
      },
      { transaction },
    );

    // 5. CONTENT
    await ProductContent.create(
      {
        product_id: product.id,
        sections: content?.sections || [],
      },
      { transaction },
    );

    // 6. LOCATIONS
    if (locationIds.length) {
      await product.setLocations(locationIds, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: {
        id: product.id,
      },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    console.error("createProduct error:", error);

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

const getAvailableAddons = async (req, res) => {
  try {
    const { locationId } = req.query;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "locationId is required",
      });
    }

    const products = await Product.findAll({
      where: { active: true },
      include: [
        {
          association: "locations",
          where: { id: locationId },
          through: { attributes: [] },
        },
      ],
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getProductBySlug = async (req, res) => {
  const product = await Product.findOne({
    where: {
      slug: req.params.slug,
    },

    include: [
      {
        association: "config",
      },
      {
        association: "content",
      },
      {
        association: "locations",
      },
    ],
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.json({
    success: true,
    data: product,
  });
};

module.exports = {
  createProduct,
  getProducts,
  getAvailableAddons,
  getProductBySlug,
};
