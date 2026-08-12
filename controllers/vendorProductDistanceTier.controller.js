const {
  VendorProduct,
  VendorProductDistanceTier,
} = require("../models");

const {
  createVendorProductDistanceTierSchema,
  updateVendorProductDistanceTierSchema,
} = require("../schemas/vendorProductDistanceTier.schema");

const createDistanceTier = async (req, res) => {
  try {
    const { error, value } =
      createVendorProductDistanceTierSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const vendorProduct =
      await VendorProduct.findByPk(
        req.params.id
      );

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product not found",
      });
    }

    if (vendorProduct.pricing_type !== "KM_BASED") {
      return res.status(400).json({
        success: false,
        message:
          "Distance tiers can only be created for KM_BASED pricing vendor products",
      });
    }

    const existingTier =
      await VendorProductDistanceTier.findOne({
        where: {
          vendor_product_id: vendorProduct.id,
          min_distance_km: value.min_distance_km,
        },
      });

    if (existingTier) {
      return res.status(409).json({
        success: false,
        message: `A tier for min_distance_km '${value.min_distance_km}' already exists`,
      });
    }

    const tier =
      await VendorProductDistanceTier.create({
        vendor_product_id: vendorProduct.id,

        min_distance_km: value.min_distance_km,

        price: value.price,

        active: value.active ?? true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Vendor Product Distance Tier created successfully",
      data: tier,
    });
  } catch (error) {
    console.error(
      "[VendorProductDistanceTierController] createDistanceTier",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDistanceTiers = async (req, res) => {
  try {
    const tiers =
      await VendorProductDistanceTier.findAll({
        where: {
          vendor_product_id: req.params.id,
        },
        order: [["min_distance_km", "ASC"]],
      });

    return res.json({
      success: true,
      count: tiers.length,
      data: tiers,
    });
  } catch (error) {
    console.error(
      "[VendorProductDistanceTierController] getDistanceTiers",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDistanceTier = async (req, res) => {
  try {
    const tier =
      await VendorProductDistanceTier.findOne({
        where: {
          id: req.params.tierId,
          vendor_product_id: req.params.id,
        },
      });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product Distance Tier not found",
      });
    }

    return res.json({
      success: true,
      data: tier,
    });
  } catch (error) {
    console.error(
      "[VendorProductDistanceTierController] getDistanceTier",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDistanceTier = async (req, res) => {
  try {
    const { error, value } =
      updateVendorProductDistanceTierSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const tier =
      await VendorProductDistanceTier.findOne({
        where: {
          id: req.params.tierId,
          vendor_product_id: req.params.id,
        },
      });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product Distance Tier not found",
      });
    }

    if (
      value.min_distance_km !== undefined &&
      Number(value.min_distance_km) !== Number(tier.min_distance_km)
    ) {
      const existingTier =
        await VendorProductDistanceTier.findOne({
          where: {
            vendor_product_id: req.params.id,
            min_distance_km: value.min_distance_km,
          },
        });

      if (existingTier) {
        return res.status(409).json({
          success: false,
          message: `A tier for min_distance_km '${value.min_distance_km}' already exists`,
        });
      }
    }

    await tier.update(value);

    return res.json({
      success: true,
      message:
        "Vendor Product Distance Tier updated successfully",
      data: tier,
    });
  } catch (error) {
    console.error(
      "[VendorProductDistanceTierController] updateDistanceTier",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteDistanceTier = async (req, res) => {
  try {
    const tier =
      await VendorProductDistanceTier.findOne({
        where: {
          id: req.params.tierId,
          vendor_product_id: req.params.id,
        },
      });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product Distance Tier not found",
      });
    }

    await tier.destroy();

    return res.json({
      success: true,
      message:
        "Vendor Product Distance Tier deleted successfully",
    });
  } catch (error) {
    console.error(
      "[VendorProductDistanceTierController] deleteDistanceTier",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createDistanceTier,
  getDistanceTiers,
  getDistanceTier,
  updateDistanceTier,
  deleteDistanceTier,
};
