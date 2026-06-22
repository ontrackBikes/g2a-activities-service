const {
  VendorProduct,
  VendorProductImage,
} = require("../models");

const {
  createVendorProductImageSchema,
  updateVendorProductImageSchema,
} = require("../schemas/vendorProductImage.schema");

const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

const createVendorProductImage = async (req, res) => {
  try {
    const { vendorProductId } = req.params;

    if (!isValidId(vendorProductId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor product ID",
      });
    }

    const { error, value } = createVendorProductImageSchema.validate(
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

    const vendorProduct = await VendorProduct.findByPk(vendorProductId);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor product not found",
      });
    }

    const image = await VendorProductImage.create({
      vendor_product_id: vendorProductId,
      ...value,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor product image created successfully",
      data: image,
    });
  } catch (error) {
    console.error("createVendorProductImage error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create vendor product image",
    });
  }
};

const getVendorProductImages = async (req, res) => {
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
      active: active === undefined ? true : active === "true",
    };

    const images = await VendorProductImage.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    console.error("getVendorProductImages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch vendor product images",
    });
  }
};

const getVendorProductImageById = async (req, res) => {
  try {
    const { vendorProductId, imageId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(imageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const image = await VendorProductImage.findOne({
      where: {
        id: imageId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Vendor product image not found",
      });
    }

    return res.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error("getVendorProductImageById error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch vendor product image",
    });
  }
};

const updateVendorProductImage = async (req, res) => {
  try {
    const { vendorProductId, imageId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(imageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const { error, value } = updateVendorProductImageSchema.validate(
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

    const image = await VendorProductImage.findOne({
      where: {
        id: imageId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Vendor product image not found",
      });
    }

    await image.update(value);

    return res.json({
      success: true,
      message: "Vendor product image updated successfully",
      data: image,
    });
  } catch (error) {
    console.error("updateVendorProductImage error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update vendor product image",
    });
  }
};

const deleteVendorProductImage = async (req, res) => {
  try {
    const { vendorProductId, imageId } = req.params;

    if (!isValidId(vendorProductId) || !isValidId(imageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const image = await VendorProductImage.findOne({
      where: {
        id: imageId,
        vendor_product_id: vendorProductId,
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Vendor product image not found",
      });
    }

    await image.update({ active: false });

    return res.json({
      success: true,
      message: "Vendor product image deleted successfully",
    });
  } catch (error) {
    console.error("deleteVendorProductImage error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete vendor product image",
    });
  }
};

module.exports = {
  createVendorProductImage,
  getVendorProductImages,
  getVendorProductImageById,
  updateVendorProductImage,
  deleteVendorProductImage,
};
