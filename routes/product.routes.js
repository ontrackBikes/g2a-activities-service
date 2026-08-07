const express = require("express");

const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  permanentlyDeleteProduct,
  searchProducts,
  getProductsListForApp,
  getRecommendedProductsForApp,
  getProductDetailsForApp,
} = require("../controllers/product.controller");
const {
  checkProductAvailability,
  getProductAvailableDates,
  getAvailableTransferLocations,
} = require(
  "../controllers/productAvailability.controller"
);
const {
  getTagsByProduct,
  removeTagFromProduct,
} = require("../controllers/productTagMapping.controller");

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
  "/app/:slug/available-locations",
  getAvailableTransferLocations,
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

router.get("/:id/tags", getTagsByProduct);

router.delete("/:productId/tags/:tagId", removeTagFromProduct);

router.get("/:id", getProduct);

router.patch("/:id", updateProduct);

router.delete("/:id/permanent", permanentlyDeleteProduct);

router.delete("/:id", deleteProduct);

module.exports = router;
