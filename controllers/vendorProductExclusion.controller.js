const {
  VendorProduct,
  VendorProductExclusion,
} = require("../models");

const {
  createExclusionSchema,
  updateExclusionSchema,
} = require("../schemas/vendorProductExclusion.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductExclusion = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createExclusionSchema.validate(req.body, {
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

    const exclusion = await VendorProductExclusion.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Exclusion created successfully",
      data: exclusion,
    });
  } catch (error) {
    console.error("createVendorProductExclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create exclusion",
    });
  }
};

const getVendorProductExclusions = async (req, res) => {
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

    const exclusions = await VendorProductExclusion.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: exclusions,
    });
  } catch (error) {
    console.error("getVendorProductExclusions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch exclusions",
    });
  }
};

const getVendorProductExclusionById = async (req, res) => {
  try {
    const { vendorProductId, exclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const exclusion = await VendorProductExclusion.findOne({
      where: {
        id: exclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Exclusion not found",
      });
    }

    return res.json({
      success: true,
      data: exclusion,
    });
  } catch (error) {
    console.error("getVendorProductExclusionById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch exclusion",
    });
  }
};

const updateVendorProductExclusion = async (req, res) => {
  try {
    const { vendorProductId, exclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateExclusionSchema.validate(req.body, {
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

    const exclusion = await VendorProductExclusion.findOne({
      where: {
        id: exclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Exclusion not found",
      });
    }

    await exclusion.update(value);

    return res.json({
      success: true,
      message: "Exclusion updated successfully",
      data: exclusion,
    });
  } catch (error) {
    console.error("updateVendorProductExclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update exclusion",
    });
  }
};

const deleteVendorProductExclusion = async (req, res) => {
  try {
    const { vendorProductId, exclusionId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(exclusionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const exclusion = await VendorProductExclusion.findOne({
      where: {
        id: exclusionId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!exclusion) {
      return res.status(404).json({
        success: false,
        message: "Exclusion not found",
      });
    }

    await exclusion.destroy();

    return res.json({
      success: true,
      message: "Exclusion deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductExclusion error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete exclusion",
    });
  }
};

module.exports = {
  createVendorProductExclusion,
  getVendorProductExclusions,
  getVendorProductExclusionById,
  updateVendorProductExclusion,
  deleteVendorProductExclusion,
};