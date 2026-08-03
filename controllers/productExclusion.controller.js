const {
  Product,
  ProductExclusion,
} = require("../models");

const {
  createProductExclusionSchema,
  updateProductExclusionSchema,
} = require("../schemas/productExclusion.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createProductExclusion = async (req, res) => {
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

    const { error, value } = createProductExclusionSchema.validate(
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

    const exclusion = await ProductExclusion.create(value);

    return res.status(201).json({
      success: true,
      message: "Product exclusion created successfully",
      data: exclusion,
    });
  } catch (error) {
    console.error(
      "[ProductExclusionController] createProductExclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create product exclusion",
    });
  }
};

const getProductExclusions = async (req, res) => {
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

    const exclusions = await ProductExclusion.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: exclusions.length,
      data: exclusions,
    });
  } catch (error) {
    console.error(
      "[ProductExclusionController] getProductExclusions:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product exclusions",
    });
  }
};

const getProductExclusionById = async (req, res) => {
  try {
    const { productId, exclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const exclusion = await ProductExclusion.findOne({
      where: {
        id: exclusionId,
        product_id: productId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Product exclusion not found",
      });
    }

    return res.json({
      success: true,
      data: exclusion,
    });
  } catch (error) {
    console.error(
      "[ProductExclusionController] getProductExclusionById:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product exclusion",
    });
  }
};

const updateProductExclusion = async (req, res) => {
  try {
    const { productId, exclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateProductExclusionSchema.validate(
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

    const exclusion = await ProductExclusion.findOne({
      where: {
        id: exclusionId,
        product_id: productId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Product exclusion not found",
      });
    }

    await exclusion.update(value);

    return res.json({
      success: true,
      message: "Product exclusion updated successfully",
      data: exclusion,
    });
  } catch (error) {
    console.error(
      "[ProductExclusionController] updateProductExclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update product exclusion",
    });
  }
};

const deleteProductExclusion = async (req, res) => {
  try {
    const { productId, exclusionId } = req.params;

    if (!isValidId(productId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const exclusion = await ProductExclusion.findOne({
      where: {
        id: exclusionId,
        product_id: productId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Product exclusion not found",
      });
    }

    await exclusion.destroy();

    return res.json({
      success: true,
      message: "Product exclusion deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductExclusionController] deleteProductExclusion:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete product exclusion",
    });
  }
};

module.exports = {
  createProductExclusion,
  getProductExclusions,
  getProductExclusionById,
  updateProductExclusion,
  deleteProductExclusion,
};
