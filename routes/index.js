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
const productFaqRoutes = require("./productFaq.routes");
const productHighlightRoutes = require("./productHighlight.routes");
const productInclusionRoutes = require("./productInclusion.routes");
const productExclusionRoutes = require("./productExclusion.routes");
const productThingToKnowRoutes = require("./productThingToKnow.routes");
const vendorProductFaqRoutes = require("./vendorProductFaq.routes");
const vendorProductHighlightRoutes = require("./vendorProductHighlight.routes");
const vendorProductInclusionRoutes = require("./vendorProductInclusion.routes");
const vendorProductExclusionRoutes = require("./vendorProductExclusion.routes");
const vendorProductThingToKnowRoutes = require("./vendorProductThingToKnow.routes");
const vendorProductTermRoutes = require("./vendorProductTerm.routes");
const vendorProductImageRoutes = require("./vendorProductImage.routes");
const mediaRoutes = require("./media.routes");
const categoryRoutes = require("./category.routes");
const productTypeRoutes = require("./productType.routes");
const productTagRoutes = require("./productTag.routes");
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

router.use("/vendor-products", vendorProductFaqRoutes);

router.use("/vendor-products", vendorProductHighlightRoutes);

router.use("/vendor-products", vendorProductInclusionRoutes);

router.use("/vendor-products", vendorProductExclusionRoutes);

router.use("/vendor-products", vendorProductThingToKnowRoutes);

router.use("/vendor-products", vendorProductTermRoutes);

router.use("/vendor-products", vendorProductImageRoutes);

router.use("/product-faqs", productFaqRoutes);

router.use("/product-highlights", productHighlightRoutes);

router.use("/product-inclusions", productInclusionRoutes);

router.use("/product-exclusions", productExclusionRoutes);

router.use("/product-things-to-know", productThingToKnowRoutes);

router.use("/media", mediaRoutes);

router.use("/product/categories", categoryRoutes);
router.use("/product/product-types", productTypeRoutes);
router.use("/product/product-tag", productTagRoutes);


module.exports = router;
