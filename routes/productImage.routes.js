const express = require("express");

const {
  createProductImage,
  getProductImages,
  updateProductImage,
  deleteProductImage,
} = require("../controllers/productImage.controller");

const router = express.Router();

router.post("/", createProductImage);

router.get("/product/:product_id", getProductImages);

router.patch("/:id", updateProductImage);

router.delete("/:id", deleteProductImage);

module.exports = router;