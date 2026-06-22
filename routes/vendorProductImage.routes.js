const router = require("express").Router();

const {
  createVendorProductImage,
  getVendorProductImages,
  getVendorProductImageById,
  updateVendorProductImage,
  deleteVendorProductImage,
} = require("../controllers/vendorProductImage.controller");

const { validateUser } = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/images",
  validateUser,
  createVendorProductImage,
);

router.get(
  "/:vendorProductId/images",
  validateUser,
  getVendorProductImages,
);

router.get(
  "/:vendorProductId/images/:imageId",
  validateUser,
  getVendorProductImageById,
);

router.patch(
  "/:vendorProductId/images/:imageId",
  validateUser,
  updateVendorProductImage,
);

router.delete(
  "/:vendorProductId/images/:imageId",
  validateUser,
  deleteVendorProductImage,
);

module.exports = router;
