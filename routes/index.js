const express = require("express");

const vendorRoutes = require("./vendor.routes");
const locationRoutes = require("./location.routes");
const productRoutes = require("./product.routes");
const productGroupRoutes = require("./productGroup.routes");
const productImagesRoutes = require("./productImage.routes");
const vendorProductsRoutes = require("./vendorProduct.routes");
const productTermRoutes = require("./productTerm.routes");
const vendorProductSlotRoutes = require("./vendorProductSlot.routes");
const vendorSchedulesRoutes = require("./vendorSchedule.routes");
const router = express.Router();

router.use("/vendors", vendorRoutes);

router.use("/locations", locationRoutes);

router.use("/products", productRoutes);

router.use("/product-groups", productGroupRoutes);

router.use("/product-images", productImagesRoutes);

router.use("/product-terms", productTermRoutes);

router.use("/vendor-products", vendorProductsRoutes);

router.use("/vendor-products/:id",vendorProductSlotRoutes);
router.use("/vendor-products/:id",vendorSchedulesRoutes);

module.exports = router;