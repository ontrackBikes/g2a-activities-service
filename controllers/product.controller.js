const { products } = require("../data/productConfig");
const productService = require("../services/productService");

const getinfoBikeRentals = (req, res) => {
  try {
    const locations = productService.bikeRentals.getLocations();
    res.json({
      success: true,
      product: productService.bikeRentals.productInfo(),
      locations: locations,
    });
  } catch (error) {
    console.error("Error fetching bike rental locations:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const checkAvailabilityBikeRentals = (req, res) => {
  try {
    const {
      locationName,
      startDate,
      endDate,
      quantity,
      pickupType = "self-pickup",
      dropType = "self-drop",
      pickup,
      drop,
    } = req.body;

    // Validate required fields
    if (!locationName || !startDate || !endDate || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: locationName, startDate, endDate, quantity",
      });
    }

    // Call service
    const result = productService.bikeRentals.checkAvailabilityPreflight({
      locationName,
      startDate,
      endDate,
      quantity,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error checking bike rental availability:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getPickupDropPointsByLocation = (req, res) => {
  try {
    const { locationName } = req.params; // GET /pickup-points/:locationName
    const result = productService.bikeRentals.getPickupDropPoints(locationName);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error fetching pickup points:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getBikeRentalLocationByName = (req, res) => {
  try {
    const { locationName } = req.params;

    const product = products.find(
      (p) => p.productType === "bike-rentals" && p.active,
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Bike rentals product not available",
      });
    }

    const location = productService.bikeRentals.getLocationByName(locationName);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// controllers/product.controller.js v2

const {
  Product,
  ProductConfig,
  ProductContent,
  Location,
} = require("../models");

const createProduct = async (req, res) => {
  const transaction = await Product.sequelize.transaction();

  try {
    const { locationIds = [], config, content, ...productData } = req.body;

    const product = await Product.create(productData, { transaction });

    await ProductConfig.create(
      {
        product_id: product.id,
        ...(config || {}),
      },
      { transaction },
    );

    await ProductContent.create(
      {
        product_id: product.id,
        sections: content?.sections || [],
      },
      { transaction },
    );

    if (locationIds.length) {
      await product.setLocations(locationIds, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: {
        id: product.id,
      },
    });
  } catch (error) {
    await transaction.rollback();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProducts = async (req, res) => {
  const { locationId, productType } = req.query;

  const where = {};

  if (productType) {
    where.product_type = productType;
  }

  const include = [
    {
      association: "config",
    },
    {
      association: "locations",
      through: {
        attributes: [],
      },
    },
  ];

  if (locationId) {
    include[1].where = {
      id: locationId,
    };
  }

  const products = await Product.findAll({
    where,
    include,
  });

  res.json({
    success: true,
    data: products,
  });
};

const getAvailableAddons = async (req, res) => {
  const { locationId } = req.query;

  const products = await Product.findAll({
    where: {
      active: true,
    },

    include: [
      {
        association: "locations",

        where: {
          id: locationId,
        },

        through: {
          attributes: [],
        },
      },
    ],
  });

  return res.json({
    success: true,
    data: products,
  });
};

const getProductBySlug = async (req, res) => {
  const product = await Product.findOne({
    where: {
      slug: req.params.slug,
    },

    include: [
      {
        association: "config",
      },
      {
        association: "content",
      },
      {
        association: "locations",
      },
    ],
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  return res.json({
    success: true,
    data: product,
  });
};

module.exports = {
  getinfoBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupDropPointsByLocation,
  getBikeRentalLocationByName,
  createProduct,
  getProducts,
  getAvailableAddons,
  getProductBySlug,
};
