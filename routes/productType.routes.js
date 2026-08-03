const {
  createProductType,
  getProductTypes,
  getProductTypeById,
  updateProductType,
  deleteProductType,
} = require("../controllers/productType.controller");
const express = require("express");
const router = express.Router();

router.post("/", createProductType); 

router.get("/", getProductTypes);

router.get("/:id", getProductTypeById);

router.patch("/:id", updateProductType);

router.delete("/:id", deleteProductType);

module.exports = router;
