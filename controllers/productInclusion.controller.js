const {
  Product,
  ProductInclusion,
} = require("../models");

const {
  createProductInclusionSchema,
  updateProductInclusionSchema,
} = require("../schemas/productInclusion.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createProductInclusion = async (req, res) => {
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

    const { error, value } = createProductInclusionSchema.validate(
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

    const inclusion = await ProductInclusion.create(value);

    return res.status(201).json({
      success: true,
      message: "Product inclusion created successfully",
      data: inclusion,
    });
  } catch (error) {
    console.error(
      "[ProductInclusionController] createProductInclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create product inclusion",
    });
  }
};

const getProductInclusions = async (req, res) => {
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

    const inclusions = await ProductInclusion.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: inclusions.length,
      data: inclusions,
    });
  } catch (error) {
    console.error(
      "[ProductInclusionController] getProductInclusions:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product inclusions",
    });
  }
};

const getProductInclusionById = async (req, res) => {
  try {
    const { productId, inclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const inclusion = await ProductInclusion.findOne({
      where: {
        id: inclusionId,
        product_id: productId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Product inclusion not found",
      });
    }

    return res.json({
      success: true,
      data: inclusion,
    });
  } catch (error) {
    console.error(
      "[ProductInclusionController] getProductInclusionById:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product inclusion",
    });
  }
};

const updateProductInclusion = async (req, res) => {
  try {
    const { productId, inclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateProductInclusionSchema.validate(
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

    const inclusion = await ProductInclusion.findOne({
      where: {
        id: inclusionId,
        product_id: productId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Product inclusion not found",
      });
    }

    await inclusion.update(value);

    return res.json({
      success: true,
      message: "Product inclusion updated successfully",
      data: inclusion,
    });
  } catch (error) {
    console.error(
      "[ProductInclusionController] updateProductInclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update product inclusion",
    });
  }
};

const deleteProductInclusion = async (req, res) => {
  try {
    const { productId, inclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const inclusion = await ProductInclusion.findOne({
      where: {
        id: inclusionId,
        product_id: productId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Product inclusion not found",
      });
    }

    await inclusion.destroy();

    return res.json({
      success: true,
      message: "Product inclusion deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductInclusionController] deleteProductInclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete product inclusion",
    });
  }
};

module.exports = {
  createProductInclusion,
  getProductInclusions,
  getProductInclusionById,
  updateProductInclusion,
  deleteProductInclusion,
};
