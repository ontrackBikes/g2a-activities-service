const express = require("express");
const {
  getLocationsBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupLocationsBikeRentals,
  getDropLocationsBikeRentals,
} = require("../controllers/product.controller");
const router = express.Router();

router.get("/bike-rentals/locations", getLocationsBikeRentals);
router.post("/bike-rentals/check-availability", checkAvailabilityBikeRentals);
router.get("/bike-rentals/locations/pickup", getPickupLocationsBikeRentals);
router.get("/bike-rentals/locations/drop", getDropLocationsBikeRentals);

module.exports = router;
