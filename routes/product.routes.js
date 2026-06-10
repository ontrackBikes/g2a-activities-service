const express = require("express");

const { validateUser } = require("../middlewares/auth.middleware");
const router = express.Router();

const {
  createProduct,
  getProductBySlug,
  getProducts,
  getAvailableAddons,
} = require("../controllers/product.controller");

router.get("/", getProducts);
router.post("/", validateUser, createProduct);
router.get("/addons-available", getAvailableAddons);
router.get("/:slug", getProductBySlug);


module.exports = router;
