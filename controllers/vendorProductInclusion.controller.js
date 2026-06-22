const {
  VendorProduct,
  VendorProductInclusion,
} = require("../models");

const {
  createInclusionSchema,
  updateInclusionSchema,
} = require("../schemas/vendorProductInclusion.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductInclusion = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createInclusionSchema.validate(req.body, {
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

    const inclusion = await VendorProductInclusion.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Inclusion created successfully",
      data: inclusion,
    });
  } catch (error) {
    console.error("createVendorProductInclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create inclusion",
    });
  }
};

const getVendorProductInclusions = async (req, res) => {
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

    const inclusions = await VendorProductInclusion.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: inclusions,
    });
  } catch (error) {
    console.error("getVendorProductInclusions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inclusions",
    });
  }
};

const getVendorProductInclusionById = async (req, res) => {
  try {
    const { vendorProductId, inclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const inclusion = await VendorProductInclusion.findOne({
      where: {
        id: inclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Inclusion not found",
      });
    }

    return res.json({
      success: true,
      data: inclusion,
    });
  } catch (error) {
    console.error("getVendorProductInclusionById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch inclusion",
    });
  }
};

const updateVendorProductInclusion = async (req, res) => {
  try {
    const { vendorProductId, inclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateInclusionSchema.validate(req.body, {
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

    const inclusion = await VendorProductInclusion.findOne({
      where: {
        id: inclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Inclusion not found",
      });
    }

    await inclusion.update(value);

    return res.json({
      success: true,
      message: "Inclusion updated successfully",
      data: inclusion,
    });
  } catch (error) {
    console.error("updateVendorProductInclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update inclusion",
    });
  }
};

const deleteVendorProductInclusion = async (req, res) => {
  try {
    const { vendorProductId, inclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(inclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const inclusion = await VendorProductInclusion.findOne({
      where: {
        id: inclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!inclusion) {
      return res.status(404).json({
        success: false,
        message: "Inclusion not found",
      });
    }

    await inclusion.destroy();

    return res.json({
      success: true,
      message: "Inclusion deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductInclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete inclusion",
    });
  }
};

module.exports = {
  createVendorProductInclusion,
  getVendorProductInclusions,
  getVendorProductInclusionById,
  updateVendorProductInclusion,
  deleteVendorProductInclusion,
};