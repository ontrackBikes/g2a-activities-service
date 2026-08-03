const {
  VendorProduct,
  VendorProductTerm,
} = require("../models");

const {
  createTermSchema,
  updateTermSchema,
} = require("../schemas/vendorProductTerm.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductTerm = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createTermSchema.validate(req.body, {
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

    const term = await VendorProductTerm.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Term created successfully",
      data: term,
    });
  } catch (error) {
    console.error("createVendorProductTerm error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create term",
    });
  }
};

const getVendorProductTerms = async (req, res) => {
  try {
    const { vendorProductId } = req.params;
    const { active } = req.query;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
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

    const terms = await VendorProductTerm.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: terms,
    });
  } catch (error) {
    console.error("getVendorProductTerms error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch terms",
    });
  }
};

const getVendorProductTermById = async (req, res) => {
  try {
    const { vendorProductId, termId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(termId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const term = await VendorProductTerm.findOne({
      where: {
        id: termId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }

    return res.json({
      success: true,
      data: term,
    });
  } catch (error) {
    console.error("getVendorProductTermById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch term",
    });
  }
};

const updateVendorProductTerm = async (req, res) => {
  try {
    const { vendorProductId, termId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(termId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateTermSchema.validate(req.body, {
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

    const term = await VendorProductTerm.findOne({
      where: {
        id: termId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }

    await term.update(value);

    return res.json({
      success: true,
      message: "Term updated successfully",
      data: term,
    });
  } catch (error) {
    console.error("updateVendorProductTerm error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update term",
    });
  }
};

const deleteVendorProductTerm = async (req, res) => {
  try {
    const { vendorProductId, termId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(termId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const term = await VendorProductTerm.findOne({
      where: {
        id: termId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }

    await term.destroy();

    return res.json({
      success: true,
      message: "Term deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductTerm error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete term",
    });
  }
};

module.exports = {
  createVendorProductTerm,
  getVendorProductTerms,
  getVendorProductTermById,
  updateVendorProductTerm,
  deleteVendorProductTerm,
};