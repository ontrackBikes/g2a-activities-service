const { Vendor } = require("../models");

const createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);

    return res.status(201).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("[VendorController] createVendor", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.findAll();

    return res.json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.error("[VendorController] getVendors", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("[VendorController] getVendor", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await vendor.update(req.body);

    return res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("[VendorController] updateVendor", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await vendor.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error("[VendorController] deleteVendor", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
};