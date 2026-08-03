const {
  VendorProduct,
  VendorProductFaq,
} = require("../models");

const {
  createFaqSchema,
  updateFaqSchema,
} = require("../schemas/vendorProductFaq.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductFaq = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createFaqSchema.validate(req.body, {
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

    const vendorProduct = await VendorProduct.findByPk(vendorProductId);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor product not found",
      });
    }

    const faq = await VendorProductFaq.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("createVendorProductFaq error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create FAQ",
    });
  }
};

const getVendorProductFaqs = async (req, res) => {
  try {
    const { vendorProductId } = req.params;
    const { active, page = "1", limit = "20" } = req.query;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    if (active !== undefined && !["true", "false"].includes(active)) {
      return res.status(400).json({
        success: false,
        message: "active must be true or false",
      });
    }

    const vendorProduct = await VendorProduct.findByPk(vendorProductId);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor product not found",
      });
    }

    const where = {
      vendor_product_id: vendorProductId,
    };

    if (active !== undefined) {
      where.active = active === "true";
    }

    const { rows, count } = await VendorProductFaq.findAndCountAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (error) {
    console.error("getVendorProductFaqs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch FAQs",
    });
  }
};

const getVendorProductFaqById = async (req, res) => {
  try {
    const { vendorProductId, faqId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const faq = await VendorProductFaq.findOne({
      where: {
        id: faqId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("getVendorProductFaqById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch FAQ",
    });
  }
};

const updateVendorProductFaq = async (req, res) => {
  try {
    const { vendorProductId, faqId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateFaqSchema.validate(req.body, {
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

    const faq = await VendorProductFaq.findOne({
      where: {
        id: faqId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await faq.update(value);

    return res.json({
      success: true,
      message: "FAQ updated successfully",
      data: faq,
    });
  } catch (error) {
    console.error("updateVendorProductFaq error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update FAQ",
    });
  }
};

const deleteVendorProductFaq = async (req, res) => {
  try {
    const { vendorProductId, faqId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const faq = await VendorProductFaq.findOne({
      where: {
        id: faqId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    await faq.destroy();

    return res.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductFaq error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete FAQ",
    });
  }
};

module.exports = {
  createVendorProductFaq,
  getVendorProductFaqs,
  getVendorProductFaqById,
  updateVendorProductFaq,
  deleteVendorProductFaq,
};