const {
  VendorProduct,
  VendorProductThingToKnow,
} = require("../models");

const {
  createThingToKnowSchema,
  updateThingToKnowSchema,
} = require("../schemas/vendorProductThingToKnow.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductThingToKnow = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createThingToKnowSchema.validate(req.body, {
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

    const thingToKnow = await VendorProductThingToKnow.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Thing to know created successfully",
      data: thingToKnow,
    });
  } catch (error) {
    console.error("createVendorProductThingToKnow error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create thing to know",
    });
  }
};

const getVendorProductThingsToKnow = async (req, res) => {
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

    const thingsToKnow = await VendorProductThingToKnow.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: thingsToKnow,
    });
  } catch (error) {
    console.error("getVendorProductThingsToKnow error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch things to know",
    });
  }
};

const getVendorProductThingToKnowById = async (req, res) => {
  try {
    const { vendorProductId, thingToKnowId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const thingToKnow = await VendorProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Thing to know not found",
      });
    }

    return res.json({
      success: true,
      data: thingToKnow,
    });
  } catch (error) {
    console.error("getVendorProductThingToKnowById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch thing to know",
    });
  }
};

const updateVendorProductThingToKnow = async (req, res) => {
  try {
    const { vendorProductId, thingToKnowId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateThingToKnowSchema.validate(req.body, {
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

    const thingToKnow = await VendorProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Thing to know not found",
      });
    }

    await thingToKnow.update(value);

    return res.json({
      success: true,
      message: "Thing to know updated successfully",
      data: thingToKnow,
    });
  } catch (error) {
    console.error("updateVendorProductThingToKnow error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update thing to know",
    });
  }
};

const deleteVendorProductThingToKnow = async (req, res) => {
  try {
    const { vendorProductId, thingToKnowId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(thingToKnowId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const thingToKnow = await VendorProductThingToKnow.findOne({
      where: {
        id: thingToKnowId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!thingToKnow) {
      return res.status(404).json({
        success: false,
        message: "Thing to know not found",
      });
    }

    await thingToKnow.destroy();

    return res.json({
      success: true,
      message: "Thing to know deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductThingToKnow error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete thing to know",
    });
  }
};

module.exports = {
  createVendorProductThingToKnow,
  getVendorProductThingsToKnow,
  getVendorProductThingToKnowById,
  updateVendorProductThingToKnow,
  deleteVendorProductThingToKnow,
};