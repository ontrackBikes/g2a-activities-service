const {
  Product,
  ProductTerm,
} = require("../models");

const {
  createProductTermSchema,
  updateProductTermSchema,
} = require("../schemas/productTerm.schema");

const createProductTerm = async (
  req,
  res
) => {
  try {
    const { error, value } =
      createProductTermSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const product =
      await Product.findByPk(
        value.product_id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const term =
      await ProductTerm.create(value);

    return res.status(201).json({
      success: true,
      message:
        "Product term created successfully",
      data: term,
    });
  } catch (error) {
    console.error(
      "[ProductTermController] createProductTerm",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProductTerms = async (
  req,
  res
) => {
  try {
    const terms =
      await ProductTerm.findAll({
        where: {
          product_id:
            req.params.product_id,
          active: true,
        },
        order: [
          ["sort_order", "ASC"],
          ["id", "ASC"],
        ],
      });

    return res.json({
      success: true,
      count: terms.length,
      data: terms,
    });
  } catch (error) {
    console.error(
      "[ProductTermController] getProductTerms",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProductTerm = async (
  req,
  res
) => {
  try {
    const { error, value } =
      updateProductTermSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const term =
      await ProductTerm.findByPk(
        req.params.id
      );

    if (!term) {
      return res.status(404).json({
        success: false,
        message:
          "Product term not found",
      });
    }

    await term.update(value);

    return res.json({
      success: true,
      message:
        "Product term updated successfully",
      data: term,
    });
  } catch (error) {
    console.error(
      "[ProductTermController] updateProductTerm",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProductTerm = async (
  req,
  res
) => {
  try {
    const term =
      await ProductTerm.findByPk(
        req.params.id
      );

    if (!term) {
      return res.status(404).json({
        success: false,
        message:
          "Product term not found",
      });
    }

    await term.update({
      active: false,
    });

    return res.json({
      success: true,
      message:
        "Product term deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductTermController] deleteProductTerm",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProductTerm,
  getProductTerms,
  updateProductTerm,
  deleteProductTerm,
};