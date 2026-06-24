const express = require("express");

const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsListForApp,
  getProductDetailsForApp,
} = require("../controllers/product.controller");

const router = express.Router();

router.post("/", createProduct);

router.get("/", getProducts);

router.get(
  "/app/products-list",
  getProductsListForApp
);
router.get(
  "/app/products-list/:slug",
  getProductDetailsForApp
);


router.get("/:id", getProduct);

router.patch("/:id", updateProduct);

router.delete("/:id", deleteProduct);

module.exports = router;