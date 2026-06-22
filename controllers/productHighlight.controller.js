const {
  Product,
  ProductHighlight,
} = require("../models");

const {
  createProductHighlightSchema,
  updateProductHighlightSchema,
} = require("../schemas/productHighlight.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createProductHighlight = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const payload = {
      ...req.body,
      product_id: Number(productId),
    };

    const { error, value } = createProductHighlightSchema.validate(
      payload,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const product = await Product.findByPk(value.product_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const highlight = await ProductHighlight.create(value);

    return res.status(201).json({
      success: true,
      message: "Product highlight created successfully",
      data: highlight,
    });
  } catch (error) {
    console.error(
      "[ProductHighlightController] createProductHighlight:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create product highlight",
    });
  }
};

const getProductHighlights = async (req, res) => {
  try {
    const { productId } = req.params;
    const { active } = req.query;

    if (!isValidId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (active !== undefined && !["true", "false"].includes(active)) {
      return res.status(400).json({
        success: false,
        message: "active must be true or false",
      });
    }

    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const where = {
      product_id: productId,
    };

    if (active !== undefined) {
      where.active = active === "true";
    }

    const highlights = await ProductHighlight.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: highlights.length,
      data: highlights,
    });
  } catch (error) {
    console.error(
      "[ProductHighlightController] getProductHighlights:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product highlights",
    });
  }
};

const getProductHighlightById = async (req, res) => {
  try {
    const { productId, highlightId } = req.params;

    if (!isValidId(productId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const highlight = await ProductHighlight.findOne({
      where: {
        id: highlightId,
        product_id: productId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Product highlight not found",
      });
    }

    return res.json({
      success: true,
      data: highlight,
    });
  } catch (error) {
    console.error(
      "[ProductHighlightController] getProductHighlightById:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product highlight",
    });
  }
};

const updateProductHighlight = async (req, res) => {
  try {
    const { productId, highlightId } = req.params;

    if (!isValidId(productId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateProductHighlightSchema.validate(
      req.body,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const highlight = await ProductHighlight.findOne({
      where: {
        id: highlightId,
        product_id: productId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Product highlight not found",
      });
    }

    await highlight.update(value);

    return res.json({
      success: true,
      message: "Product highlight updated successfully",
      data: highlight,
    });
  } catch (error) {
    console.error(
      "[ProductHighlightController] updateProductHighlight:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update product highlight",
    });
  }
};

const deleteProductHighlight = async (req, res) => {
  try {
    const { productId, highlightId } = req.params;

    if (!isValidId(productId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const highlight = await ProductHighlight.findOne({
      where: {
        id: highlightId,
        product_id: productId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Product highlight not found",
      });
    }

    await highlight.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Product highlight deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductHighlightController] deleteProductHighlight:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete product highlight",
    });
  }
};

module.exports = {
  createProductHighlight,
  getProductHighlights,
  getProductHighlightById,
  updateProductHighlight,
  deleteProductHighlight,
};