const {
  Vendor,
  Product,
  Location,
  VendorProduct,
  VendorProductImage,
  VendorProductFaq,
  VendorProductTerm,
  VendorProductHighlight,
  VendorProductInclusion,
  VendorProductExclusion,
  VendorProductThingToKnow,
  VendorProductSlot,
} = require("../models");
const { Op } = require("sequelize");
const {
  createVendorProductSchema,
  updateVendorProductSchema,
} = require("../schemas/vendorProduct.schema");

const createVendorProduct = async (req, res) => {
  try {
    const { error, value } = createVendorProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const vendor = await Vendor.findByPk(value.vendor_id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const product = await Product.findByPk(value.product_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const location = await Location.findByPk(value.location_id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const existing = await VendorProduct.findOne({
      where: {
        vendor_id: value.vendor_id,
        product_id: value.product_id,
        location_id: value.location_id,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Vendor Product already exists",
      });
    }

    const vendorProduct = await VendorProduct.create(value);

    return res.status(201).json({
      success: true,
      message: "Vendor Product created successfully",
      data: {
        ...vendorProduct.toJSON(),
        next_step:
          value.pricing_type === "SLOT"
            ? "CONFIGURE_SLOTS"
            : "GENERATE_INVENTORY",
      },
    });
  } catch (error) {
    console.error("[VendorProductController] createVendorProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const { vendor_id, product_id, location_id, active, search } = req.query;

    const where = {};

    if (vendor_id) {
      where.vendor_id = vendor_id;
    }

    if (product_id) {
      where.product_id = product_id;
    }

    if (location_id) {
      where.location_id = location_id;
    }

    if (active !== undefined && active !== "") {
      where.active = active === "true";
    }

    if (search && search.trim()) {
      const term = search.trim();

      // Vendor/product/location names live on associated models, so
      // Sequelize needs the "$association.field$" syntax to search them.
      where[Op.or] = [
        { "$vendor.name$": { [Op.like]: `%${term}%` } },
        { "$product.name$": { [Op.like]: `%${term}%` } },
        { "$location.name$": { [Op.like]: `%${term}%` } },
      ];
    }

    const vendorProducts = await VendorProduct.findAll({
      where,

      include: [
        {
          model: Vendor,
          as: "vendor",
        },
        {
          model: Product,
          as: "product",
        },
        {
          model: Location,
          as: "location",
        },
      ],

      // Required when filtering/searching on included model columns
      // via $association.field$ — avoids duplicate-row issues from
      // the implicit subquery Sequelize would otherwise generate.
      subQuery: false,

      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      count: vendorProducts.length,
      data: vendorProducts,
    });
  } catch (error) {
    console.error("[VendorProductController] getVendorProducts", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorProduct = async (req, res) => {
  try {
    const vendorProduct = await VendorProduct.findByPk(req.params.id, {
      include: [
        {
          model: Vendor,
          as: "vendor",
        },
        {
          model: Product,
          as: "product",
        },
        {
          model: Location,
          as: "location",
        },

        {
          model: VendorProductImage,
          as: "images",
        },

        {
          model: VendorProductFaq,
          as: "faqs",
        },

        {
          model: VendorProductTerm,
          as: "terms",
        },

        {
          model: VendorProductHighlight,
          as: "highlights",
        },

        {
          model: VendorProductInclusion,
          as: "inclusions",
        },

        {
          model: VendorProductExclusion,
          as: "exclusions",
        },

        {
          model: VendorProductThingToKnow,
          as: "thingsToKnow",
        },

        {
          model: VendorProductSlot,
          as: "slots",
        },
      ],
    });

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product not found",
      });
    }

    return res.json({
      success: true,
      data: vendorProduct,
    });
  } catch (error) {
    console.error("[VendorProductController] getVendorProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateVendorProduct = async (req, res) => {
  try {
    const { error, value } = updateVendorProductSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const vendorProduct = await VendorProduct.findByPk(req.params.id);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product not found",
      });
    }

    await vendorProduct.update(value);

    return res.json({
      success: true,
      message: "Vendor Product updated successfully",
      data: vendorProduct,
    });
  } catch (error) {
    console.error("[VendorProductController] updateVendorProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteVendorProduct = async (req, res) => {
  try {
    const vendorProduct = await VendorProduct.findByPk(req.params.id);

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product not found",
      });
    }

    await vendorProduct.update({
      active: false,
    });

    return res.json({
      success: true,
      message: "Vendor Product deleted successfully",
    });
  } catch (error) {
    console.error("[VendorProductController] deleteVendorProduct", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createVendorProduct,
  getVendorProducts,
  getVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
};
