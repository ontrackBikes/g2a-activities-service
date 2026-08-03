const router = require("express").Router();

const {
  createVendorProductInclusion,
  getVendorProductInclusions,
  getVendorProductInclusionById,
  updateVendorProductInclusion,
  deleteVendorProductInclusion,
} = require("../controllers/vendorProductInclusion.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/inclusions",
  validateUser,
  createVendorProductInclusion,
);

router.get(
  "/:vendorProductId/inclusions",
  validateUser,
  getVendorProductInclusions,
);

router.get(
  "/:vendorProductId/inclusions/:inclusionId",
  validateUser,
  getVendorProductInclusionById,
);

router.patch(
  "/:vendorProductId/inclusions/:inclusionId",
  validateUser,
  updateVendorProductInclusion,
);

router.delete(
  "/:vendorProductId/inclusions/:inclusionId",
  validateUser,
  deleteVendorProductInclusion,
);

module.exports = router;