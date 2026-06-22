const {
  Product,
  ProductFaq,
} = require("../models");

const {
  createProductFaqSchema,
  updateProductFaqSchema,
} = require("../schemas/productFaq.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createProductFaq = async (req, res) => {
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

    const { error, value } = createProductFaqSchema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
    });

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

    const faq = await ProductFaq.create(value);

    return res.status(201).json({
      success: true,
      message: "Product FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("[ProductFaqController] createProductFaq:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create product FAQ",
    });
  }
};

const getProductFaqs = async (req, res) => {
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

    const faqs = await ProductFaq.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("[ProductFaqController] getProductFaqs:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product FAQs",
    });
  }
};

const getProductFaqById = async (req, res) => {
  try {
    const { productId, faqId } = req.params;

    if (!isValidId(productId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const faq = await ProductFaq.findOne({
      where: {
        id: faqId,
        product_id: productId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "Product FAQ not found",
      });
    }

    return res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("[ProductFaqController] getProductFaqById:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch product FAQ",
    });
  }
};

const updateProductFaq = async (req, res) => {
  try {
    const { productId, faqId } = req.params;

    if (!isValidId(productId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateProductFaqSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const faq = await ProductFaq.findOne({
      where: {
        id: faqId,
        product_id: productId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "Product FAQ not found",
      });
    }

    await faq.update(value);

    return res.json({
      success: true,
      message: "Product FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("[ProductFaqController] updateProductFaq:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update product FAQ",
    });
  }
};

const deleteProductFaq = async (req, res) => {
  try {
    const { productId, faqId } = req.params;

    if (!isValidId(productId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const faq = await ProductFaq.findOne({
      where: {
        id: faqId,
        product_id: productId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "Product FAQ not found",
      });
    }

    await faq.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Product FAQ deleted successfully",
    });
  } catch (error) {
    console.error("[ProductFaqController] deleteProductFaq:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete product FAQ",
    });
  }
};

module.exports = {
  createProductFaq,
  getProductFaqs,
  getProductFaqById,
  updateProductFaq,
  deleteProductFaq,
};