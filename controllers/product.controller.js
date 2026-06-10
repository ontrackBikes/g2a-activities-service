const { products } = require("../data/productConfig");
const bikeRentalService = require("../services/bikeRentals");

// controllers/product.controller.js v2

const {
  Product,
  ProductConfig,
  ProductContent,
  Location,
} = require("../models");

const productSchema = require("../schemas/product.schema");

const createProduct = async (req, res) => {
  let transaction;

  try {
    // 1. VALIDATE REQUEST FIRST
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

    const { locationIds = [], config, content, ...productData } = value;

    // 2. START TRANSACTION ONLY AFTER VALIDATION
    transaction = await Product.sequelize.transaction();

    // 3. CREATE PRODUCT
    const product = await Product.create(productData, { transaction });

    // 4. CREATE CONFIG
    await ProductConfig.create(
      {
        product_id: product.id,
        ...(config || {}),
      },
      { transaction },
    );

    // 5. CREATE CONTENT
    await ProductContent.create(
      {
        product_id: product.id,
        sections: content?.sections || [],
      },
      { transaction },
    );

    // 6. MAP LOCATIONS (M2M)
    if (locationIds.length) {
      await product.setLocations(locationIds, { transaction });
    }

    // 7. COMMIT
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: {
        id: product.id,
      },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();

    console.error("createProduct error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getProducts = async (req, res) => {
  const { locationId, productType } = req.query;

  const where = {};

  if (productType) {
    where.product_type = productType;
  }

  const include = [
    {
      association: "config",
    },
    {
      association: "locations",
      through: {
        attributes: [],
      },
    },
  ];

  if (locationId) {
    include[1].where = {
      id: locationId,
    };
  }

  const products = await Product.findAll({
    where,
    include,
  });

  res.json({
    success: true,
    data: products,
  });
};

const getAvailableAddons = async (req, res) => {
  const { locationId } = req.query;

  const products = await Product.findAll({
    where: {
      active: true,
    },

    include: [
      {
        association: "locations",

        where: {
          id: locationId,
        },

        through: {
          attributes: [],
        },
      },
    ],
  });

  return res.json({
    success: true,
    data: products,
  });
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
