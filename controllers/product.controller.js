const { Op } = require("sequelize");
const productSchema = require("../schemas/product.schema");
const { Product, ProductConfig, ProductContent } = require("../models");
const { parseError } = require("../services/error.service");
const productPatchSchema = require("../schemas/productPatch.schema");
const pricingOverrideSchema = require("../schemas/pricingOverride.schema");
const { getPrice } = require("../services/pricing.service");

// USERE FACING

const searchProducts = async (req, res) => {
  try {
    const {
      location,
      bookingDate,
      quantity = 1,
      category,
      productType,
      source = "website",
    } = req.body;

    const where = {
      active: true,
    };

    if (category) {
      where.category = category;
    }

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

    // location search
    if (location) {
      const normalizedLocation = location
        .trim()
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ");

      include[1].required = true;

      include[1].where = {
        name: {
          [Op.like]: `%${normalizedLocation}%`,
        },
      };
    }

    const products = await Product.findAll({
      where,
      include,
      order: [["name", "ASC"]],
    });

    const data = products.map((product) => {
      const pricing =
        product.config?.pricing || {};

      const bookingDay = bookingDate
        ? new Date(bookingDate)
            .toLocaleDateString("en-US", {
              weekday: "short",
            })
            .toUpperCase()
        : null;

      const context = {
        location,
        quantity,
        booking_date: bookingDate,
        day_of_week: bookingDay,
        source,
      };

      const finalPrice = getPrice({
        pricing,
        context,
      });

      return {
        id: product.id,

        name: product.name,

        slug: product.slug,

        category: product.category,

        product_type: product.product_type,

        thumbnail_url:
          product.thumbnail_url,

        locations: product.locations.map(
          (l) => l.name
        ),

        price: {
          currency:
            pricing.currency || "INR",

          basePrice:
            pricing.basePrice || 0,

          finalPrice,
        },
      };
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    const parsed = parseError(error);

    return res.status(
      parsed.statusCode || 500
    ).json({
      success: false,
      message: parsed.message,
      tech_message:
        parsed.tech_message,
    });
  }
};

// USER FACING END

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

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

const getProductById = async (req, res) => {
  const product = await Product.findByPk(
    req.params.id,
    {
      include: [
        { association: "config" },
        { association: "content" },
        { association: "locations" },
      ],
    }
  );

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

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
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

const updateProduct = async (req, res) => {
  let transaction;

  try {
    const productId = req.params.id;

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

    const {
      locationIds = [],
      config,
      content,
      ...productData
    } = value;

    transaction = await Product.sequelize.transaction();

    const product = await Product.findByPk(productId, {
      transaction,
    });

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // update main product
    await product.update(productData, {
      transaction,
    });

    // update config
    await ProductConfig.update(
      config,
      {
        where: {
          product_id: product.id,
        },
        transaction,
      },
    );

    // update content
    await ProductContent.update(
      {
        sections: content?.sections || [],
      },
      {
        where: {
          product_id: product.id,
        },
        transaction,
      },
    );

    // replace locations
    await product.setLocations(locationIds, {
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: {
        id: product.id,
      },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

const patchProduct = async (req, res) => {
  let transaction;

  try {
    const { error, value } = productPatchSchema.validate(req.body, {
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

    const {
      locationIds,
      config,
      content,
      ...productFields
    } = value;
    

    // Prevent override management through PATCH product
    if (
      config?.pricing &&
      Object.prototype.hasOwnProperty.call(
        config.pricing,
        "overrides"
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Use pricing override APIs to manage overrides",
      });
    }

    transaction = await Product.sequelize.transaction();

    const product = await Product.findByPk(req.params.id, {
      include: [
        { association: "config" },
        { association: "content" },
      ],
      transaction,
    });

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

   

    // Product table
    if (Object.keys(productFields).length) {
      await product.update(productFields, {
        transaction,
      });
    }

    // Product Config
    if (config) {
      await product.config.update(
        {
          ...product.config.toJSON(),
          ...config,
        },
        {
          transaction,
        }
      );
    }

    // Product Content
    if (content) {
      await product.content.update(
        {
          ...product.content.toJSON(),
          ...content,
        },
        {
          transaction,
        }
      );
    }

    // Locations
    if (locationIds) {
      await product.setLocations(locationIds, {
        transaction,
      });
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

const addPricingOverride = async (req, res) => {
  let transaction;

  try {
    const { error, value } =
      pricingOverrideSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map(d => d.message),
      });
    }

    transaction =
      await Product.sequelize.transaction();

    const product = await Product.findByPk(
      req.params.id,
      {
        include: [{ association: "config" }],
        transaction,
      }
    );

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const config = product.config.toJSON();

    config.pricing.overrides =
      config.pricing.overrides || [];

    const exists =
      config.pricing.overrides.find(
        o => o.id === value.id
      );

    if (exists) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message: "Override already exists",
      });
    }

    config.pricing.overrides.push(value);

    await product.config.update(config, {
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Pricing override added",
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json(parsed);
  }
};

const updatePricingOverride = async (req, res) => {
  let transaction;

  try {
    transaction =
      await Product.sequelize.transaction();

    const product = await Product.findByPk(
      req.params.id,
      {
        include: [{ association: "config" }],
        transaction,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const config = product.config.toJSON();

    const index =
      config.pricing.overrides.findIndex(
        o => o.id === req.params.overrideId
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Override not found",
      });
    }

    config.pricing.overrides[index] = {
      ...config.pricing.overrides[index],
      ...req.body,
    };

    await product.config.update(config, {
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Override updated",
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json(parsed);
  }
};

const deletePricingOverride = async (req, res) => {
  let transaction;

  try {
    transaction =
      await Product.sequelize.transaction();

    const product = await Product.findByPk(
      req.params.id,
      {
        include: [{ association: "config" }],
        transaction,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const config = product.config.toJSON();

    config.pricing.overrides =
      config.pricing.overrides.filter(
        o => o.id !== req.params.overrideId
      );

    await product.config.update(config, {
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Override removed",
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    const parsed = parseError(error);

    return res.status(parsed.statusCode).json(parsed);
  }
};

const getPricingOverrides = async (req, res) => {
  try {
    const product = await Product.findByPk(
      req.params.id,
      {
        include: [
          {
            association: "config",
          },
        ],
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data:
        product.config?.pricing?.overrides || [],
    });
  } catch (error) {
    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

const getPricingOverrideById = async (
  req,
  res
) => {
  try {
    const product = await Product.findByPk(
      req.params.id,
      {
        include: [
          {
            association: "config",
          },
        ],
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const override =
      product.config?.pricing?.overrides?.find(
        (o) =>
          o.id === req.params.overrideId
      );

    if (!override) {
      return res.status(404).json({
        success: false,
        message: "Pricing override not found",
      });
    }

    return res.json({
      success: true,
      data: override,
    });
  } catch (error) {
    const parsed = parseError(error);

    return res.status(parsed.statusCode).json({
      success: false,
      message: parsed.message,
      tech_message: parsed.tech_message,
    });
  }
};

module.exports = {
  searchProducts,
  createProduct,
  getProducts,
  getProductById,
  getAvailableAddons,
  getProductBySlug,
  updateProduct,
  patchProduct,
  addPricingOverride,
  updatePricingOverride,
  deletePricingOverride,
  getPricingOverrides,
  getPricingOverrideById

};
