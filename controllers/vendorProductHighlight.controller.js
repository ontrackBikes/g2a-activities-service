const {
  VendorProduct,
  VendorProductHighlight,
} = require("../models");

const {
  createHighlightSchema,
  updateHighlightSchema,
} = require("../schemas/vendorProductHighlight.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductHighlight = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createHighlightSchema.validate(req.body, {
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

    const highlight = await VendorProductHighlight.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Highlight created successfully",
      data: highlight,
    });
  } catch (error) {
    console.error("createVendorProductHighlight error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create highlight",
    });
  }
};

const getVendorProductHighlights = async (req, res) => {
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

    const highlights = await VendorProductHighlight.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: highlights,
    });
  } catch (error) {
    console.error("getVendorProductHighlights error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch highlights",
    });
  }
};

const getVendorProductHighlightById = async (req, res) => {
  try {
    const { vendorProductId, highlightId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const highlight = await VendorProductHighlight.findOne({
      where: {
        id: highlightId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    return res.json({
      success: true,
      data: highlight,
    });
  } catch (error) {
    console.error("getVendorProductHighlightById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch highlight",
    });
  }
};

const updateVendorProductHighlight = async (req, res) => {
  try {
    const { vendorProductId, highlightId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateHighlightSchema.validate(req.body, {
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

    const highlight = await VendorProductHighlight.findOne({
      where: {
        id: highlightId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    await highlight.update(value);

    return res.json({
      success: true,
      message: "Highlight updated successfully",
      data: highlight,
    });
  } catch (error) {
    console.error("updateVendorProductHighlight error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update highlight",
    });
  }
};

const deleteVendorProductHighlight = async (req, res) => {
  try {
    const { vendorProductId, highlightId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(highlightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const highlight = await VendorProductHighlight.findOne({
      where: {
        id: highlightId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: "Highlight not found",
      });
    }

    await highlight.destroy();

    return res.json({
      success: true,
      message: "Highlight deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductHighlight error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete highlight",
    });
  }
};

module.exports = {
  createVendorProductHighlight,
  getVendorProductHighlights,
  getVendorProductHighlightById,
  updateVendorProductHighlight,
  deleteVendorProductHighlight,
};