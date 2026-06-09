const express = require("express");
const {
  getinfoBikeRentals,
  checkAvailabilityBikeRentals,
  getPickupDropPointsByLocation,
  getBikeRentalLocationByName,
  createProduct,
  getProductBySlug,
  getProducts,
  getAvailableAddons,
} = require("../controllers/product.controller");
const router = express.Router();

router.get("/bike-rentals/product-info", getinfoBikeRentals);
router.post("/bike-rentals/check-availability", checkAvailabilityBikeRentals);
router.get(
  "/bike-rentals/pickup-drop-points/:locationName",
  getPickupDropPointsByLocation,
);

router.get("/bike-rentals/location/:locationName", getBikeRentalLocationByName);

router.post("/products", createProduct);

router.get("/products/addons-available", getAvailableAddons);

router.get("/products/:slug", getProductBySlug);

router.get("/products", getProducts);

module.exports = router;
