const express = require("express");

const vendorRoutes = require("./vendor.routes");
const locationRoutes = require("./location.routes");
const productRoutes = require("./product.routes");
const productGroupRoutes = require("./productGroup.routes")
const productImagesRoutes = require("./productImage.routes")
const vendorProductsRoutes = require("./vendorProduct.routes")


const router = express.Router();

router.use("/vendors", vendorRoutes);

router.use("/locations", locationRoutes);

router.use("/products", productRoutes);

router.use("/product-groups", productGroupRoutes);

router.use("/product-images", productImagesRoutes);

router.use("/vendor-products", vendorProductsRoutes);

module.exports = router;