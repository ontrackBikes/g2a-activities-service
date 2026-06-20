const express = require("express");

const vendorRoutes = require("./vendor.routes");
const locationRoutes = require("./location.routes");
const productRoutes = require("./product.routes");

const router = express.Router();

router.use("/vendors", vendorRoutes);

router.use("/locations", locationRoutes);

router.use("/products", productRoutes);


module.exports = router;