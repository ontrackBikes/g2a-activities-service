const {
  Product,
  ProductThingToKnow,
} = require("../models");

const {
  createProductThingToKnowSchema,
  updateProductThingToKnowSchema,
} = require("../schemas/productThingToKnow.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createProductThingToKnow = async (req, res) => {
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

    const { error, value } = createProductThingToKnowSchema.validate(
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

    const thingToKnow = await ProductThingToKnow.create(value);

    return res.status(201).json({
      success: true,
      message: "Product thing to know created successfully",
      data: thingToKnow,
    });
  } catch (error) {
    console.error(
      "[ProductThingToKnowController] createProductThingToKnow:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create product thing to know",
    });
  }
};

const getProductThingsToKnow = async (req, res) => {
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

    const thingsToKnow = await ProductThingToKnow.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: thingsToKnow.length,
      data: thingsToKnow,
    });
  } catch (error) {
    console.error(
      "[ProductThingToKnowController] getProductThingsToKnow:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product things to know",
    });
  }
};

const getProductThingToKnowById = async (req, res) => {
  try {
    const { productId, thingToKnowId } = req.params;

    if (!isValidId(productId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const thingToKnow = await ProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        product_id: productId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Product thing to know not found",
      });
    }

    return res.json({
      success: true,
      data: thingToKnow,
    });
  } catch (error) {
    console.error(
      "[ProductThingToKnowController] getProductThingToKnowById:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product thing to know",
    });
  }
};

const updateProductThingToKnow = async (req, res) => {
  try {
    const { productId, thingToKnowId } = req.params;

    if (!isValidId(productId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateProductThingToKnowSchema.validate(
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

    const thingToKnow = await ProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        product_id: productId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Product thing to know not found",
      });
    }

    await thingToKnow.update(value);

    return res.json({
      success: true,
      message: "Product thing to know updated successfully",
      data: thingToKnow,
    });
  } catch (error) {
    console.error(
      "[ProductThingToKnowController] updateProductThingToKnow:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update product thing to know",
    });
  }
};

const deleteProductThingToKnow = async (req, res) => {
  try {
    const { productId, thingToKnowId } = req.params;

    if (!isValidId(productId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const thingToKnow = await ProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        product_id: productId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Product thing to know not found",
      });
    }

    await thingToKnow.destroy();

    return res.json({
      success: true,
      message: "Product thing to know deleted successfully",
    });
  } catch (error) {
    console.error(
      "[ProductThingToKnowController] deleteProductThingToKnow:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to delete product thing to know",
    });
  }
};

module.exports = {
  createProductThingToKnow,
  getProductThingsToKnow,
  getProductThingToKnowById,
  updateProductThingToKnow,
  deleteProductThingToKnow,
};
