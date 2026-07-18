const express = require("express");
const {
  getinfoBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupDropPointsByLocation,
  getBikeRentalPickupDropPointsByLocationSlug,
  getBikeRentalLocationByName,
} = require("../controllers/bikeRentals.controller");
const router = express.Router();

router.get("/product-info", getinfoBikeRentals);
router.post("/check-availability", checkAvailabilityBikeRentals);
router.get(
  "/pickup-drop-points/:locationName",
  getPickupDropPointsByLocation,
);

router.get(
  "/locations/:locationSlug/pickup-drop-points",
  getBikeRentalPickupDropPointsByLocationSlug,
);

router.get("/location/:locationName", getBikeRentalLocationByName);

module.exports = router;
