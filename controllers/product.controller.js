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

const getPickupLocationsBikeRentals = (req, res) => {
  try {
    const locations = productService.bikeRentals.getLocations({
      pickupOnly: true,
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error("Error fetching bike rental pickup locations:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getDropLocationsBikeRentals = (req, res) => {
  try {
    const locations = productService.bikeRentals.getLocations({
      dropOnly: true,
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error("Error fetching bike rental drop locations:", error);
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
      (p) => p.productType === "bike-rentals" && p.active
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

module.exports = {
  getinfoBikeRentals,
  getPickupLocationsBikeRentals,
  getDropLocationsBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupDropPointsByLocation,
  getBikeRentalLocationByName,
};
