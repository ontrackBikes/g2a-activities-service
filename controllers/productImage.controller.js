const {
  Product,
  ProductImage,
} = require("../models");

const {
  createProductImageSchema,
  updateProductImageSchema,
} = require("../schemas/productImage.schema");

const createProductImage = async (req, res) => {
  try {
    const { error, value } =
      createProductImageSchema.validate(req.body);

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

    const image = await ProductImage.create(value);

    return res.status(201).json({
      success: true,
      message: "Product image created successfully",
      data: image,
    });
  } catch (error) {
    console.error(
      "[ProductImageController] createProductImage",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProductImages = async (req, res) => {
  try {
    const images = await ProductImage.findAll({
      where: {
        product_id: req.params.product_id,
        active: true,
      },
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    console.error(
      "[ProductImageController] getProductImages",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProductImage = async (req, res) => {
  try {
    const { error, value } =
      updateProductImageSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const image = await ProductImage.findByPk(
      req.params.id
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    await image.update(value);

    return res.json({
      success: true,
      message: "Image updated successfully",
      data: image,
    });
  } catch (error) {
    console.error(
      "[ProductImageController] updateProductImage",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const image = await ProductImage.findByPk(
      req.params.id
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    await image.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductImageController] deleteProductImage",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProductImage,
  getProductImages,
  updateProductImage,
  deleteProductImage,
};