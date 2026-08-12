const express = require("express");

const vendorRoutes = require("./vendor.routes");
const locationRoutes = require("./location.routes");
const productRoutes = require("./product.routes");
const productGroupRoutes = require("./productGroup.routes");
const productImagesRoutes = require("./productImage.routes");
const vendorProductsRoutes = require("./vendorProduct.routes");
const productTermRoutes = require("./productTerm.routes");
const vendorProductSlotRoutes = require("./vendorProductSlot.routes");
const vendorProductDistanceTierRoutes = require("./vendorProductDistanceTier.routes");
const vendorSchedulesRoutes = require("./vendorSchedule.routes");
const productFaqRoutes = require("./productFaq.routes");
const productHighlightRoutes = require("./productHighlight.routes");
const productInclusionRoutes = require("./productInclusion.routes");
const productExclusionRoutes = require("./productExclusion.routes");
const productThingToKnowRoutes = require("./productThingToKnow.routes");
const productCancellationPolicyRoutes = require("./productCancellationPolicy.routes");
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
const bookingTemplate = require("./bookingTemplate.routes");
const bookingEstimate = require("./bookingEstimate.routes");
const order = require("./order.routes");
const bikeRentalsRoutes = require("./bikeRentals.routes");
const razorpayRoutes = require("./razorpay.routes");
const authRoutes = require("./auth.routes");
const paymentRoutes = require("./payment.routes");
const googleMapsRoutes = require("./googleMaps.routes");

const productCollectionRoutes =
  require("./productCollection.routes");

const productCollectionProductRoutes =
  require("./productCollectionProduct.routes");
const router = express.Router();

router.use("/auth", authRoutes);

router.use("/rzp", razorpayRoutes);

router.use("/vendors", vendorRoutes);

router.use("/locations", locationRoutes);

router.use("/products", productRoutes);

router.use("/product-groups", productGroupRoutes);

router.use("/product-images", productImagesRoutes);

router.use("/product-terms", productTermRoutes);

router.use("/vendor-products", vendorProductsRoutes);

router.use("/vendor-products/:id",vendorProductSlotRoutes);

router.use("/vendor-products/:id",vendorProductDistanceTierRoutes);

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

router.use(
  "/product-cancellation-policies",
  productCancellationPolicyRoutes,
);

router.use("/media", mediaRoutes);

router.use("/product-categories", categoryRoutes);

router.use("/product-types", productTypeRoutes);

router.use("/product-tags", productTagRoutes);

router.use(
  "/product-collections",
  productCollectionRoutes
);

router.use(
  "/product-collection-products",
  productCollectionProductRoutes
);

router.use(
  "/booking-templates",
  bookingTemplate
);


router.use(
  "/booking-estimates",
  bookingEstimate,
);

router.use(
  "/orders",
  order,
);

router.use(
  "/payments",
  paymentRoutes,
);

router.use(
  "/places",
  googleMapsRoutes,
);

router.use(
  "/bike-rentals",
  bikeRentalsRoutes,
);
module.exports = router;
