const express = require("express");

const {
  createVendorProduct,
  getVendorProducts,
  getVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
} = require("../controllers/vendorProduct.controller");

const router = express.Router();

router.post("/", createVendorProduct);

router.get("/", getVendorProducts);

router.get("/:id", getVendorProduct);

router.patch("/:id", updateVendorProduct);

router.delete("/:id", deleteVendorProduct);

module.exports = router;