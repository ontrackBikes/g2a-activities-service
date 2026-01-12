const express = require("express");
const router = express.Router();

const {
  getProducts,
  getProductByType,
} = require("../controllers/product.controller");

router.get("/", getProducts);
router.get("/:productType", getProductByType);

module.exports = router;
