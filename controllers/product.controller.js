const productService = require("../services/productService");

const getLocationsBikeRentals = (req, res) => {
  try {
    const locations = productService.bikeRentals.getLocations();
    res.json({ success: true, data: locations });
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
      pickup = true,
      drop = true,
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
    const result = productService.bikeRentals.checkAvailability({
      locationName,
      startDate,
      endDate,
      quantity,
      pickup,
      drop,
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

module.exports = {
  getLocationsBikeRentals,
  getPickupLocationsBikeRentals,
  getDropLocationsBikeRentals,
  checkAvailabilityBikeRentals,
};
