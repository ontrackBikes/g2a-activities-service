const express = require("express");

const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsListForApp,
  getRecommendedProductsForApp,
  getProductDetailsForApp,
} = require("../controllers/product.controller");
const {
  checkProductAvailability,
  getProductAvailableDates,
} = require(
  "../controllers/productAvailability.controller"
);

const router = express.Router();

router.post("/", createProduct);

router.get("/", getProducts);

router.get("/search", searchProducts);


router.get(
  "/app/products-list",
  getProductsListForApp
);
router.get(
  "/app/products-list/:slug",
  getProductDetailsForApp
);

router.get(
  "/app/:slug/recommended",
  getRecommendedProductsForApp,
);

router.get(
  "/app/:slug/available-dates",
  getProductAvailableDates,
);

router.post(
  "/app/:slug/check-available",
  checkProductAvailability,
);


router.get("/:id", getProduct);

router.patch("/:id", updateProduct);

router.delete("/:id", deleteProduct);

module.exports = router;
