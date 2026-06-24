const { Op } = require("sequelize");

const {
  Product,
  ProductGroup,
  ProductImage,
  ProductType,
} = require("../models");

const {
  createProductSchema,
  updateProductSchema,
} = require("../schemas/product.schema");


const createProduct = async (req, res) => {
  try {
    const { error, value } =
      createProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    /**
     * Validate Product Group
     */
    if (value.group_id) {
      const group = await ProductGroup.findByPk(
        value.group_id
      );

      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Product group not found",
        });
      }
    }

    /**
     * Validate Product Type
     */
    const productType = await ProductType.findByPk(
      value.product_type_id
    );

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    /**
     * Duplicate Slug Check
     */
    const existingSlug =
      await Product.findOne({
        where: {
          slug: value.slug,
        },
      });

    if (existingSlug) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists",
      });
    }

    /**
     * Duplicate Code Check
     */
    if (value.code) {
      const existingCode =
        await Product.findOne({
          where: {
            code: value.code,
          },
        });

      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: "Code already exists",
        });
      }
    }

    const product = await Product.create(value);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "[ProductController] createProduct",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const {
      active,
      group_id,
      product_type,
      search,
    } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (group_id) {
      where.group_id = group_id;
    }

    if (product_type) {
      where.product_type = product_type;
    }

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          slug: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const products = await Product.findAll({
      where,
      include: [
        {
          model: ProductGroup,
          as: "group",
        },
      ],
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error(
      "[ProductController] getProducts",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(
      req.params.id,
      {
        include: [
          {
            model: ProductGroup,
            as: "group",
          },
          {
            model: ProductImage,
            as: "images",
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
      data: product,
    });
  } catch (error) {
    console.error(
      "[ProductController] getProduct",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { error, value } =
      updateProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product = await Product.findByPk(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.update(value);

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "[ProductController] updateProduct",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductController] deleteProduct",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};