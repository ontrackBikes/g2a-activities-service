const express = require("express");
const {
  getinfoBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupLocationsBikeRentals,
  getDropLocationsBikeRentals,
  getPickupDropPointsByLocation,
  getBikeRentalLocationByName,
} = require("../controllers/product.controller");
const router = express.Router();

router.get("/bike-rentals/product-info", getinfoBikeRentals);
router.post("/bike-rentals/check-availability", checkAvailabilityBikeRentals);
router.get("/bike-rentals/locations/pickup", getPickupLocationsBikeRentals);
router.get("/bike-rentals/locations/drop", getDropLocationsBikeRentals);
router.get(
  "/bike-rentals/pickup-drop-points/:locationName",
  getPickupDropPointsByLocation
);

router.get("/bike-rentals/location/:locationName", getBikeRentalLocationByName);

module.exports = router;
