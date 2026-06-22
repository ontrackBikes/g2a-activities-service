const router = require("express").Router();

const {
  createVendorProductExclusion,
  getVendorProductExclusions,
  getVendorProductExclusionById,
  updateVendorProductExclusion,
  deleteVendorProductExclusion,
} = require("../controllers/vendorProductExclusion.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/exclusions",
  validateUser,
  createVendorProductExclusion,
);

router.get(
  "/:vendorProductId/exclusions",
  validateUser,
  getVendorProductExclusions,
);

router.get(
  "/:vendorProductId/exclusions/:exclusionId",
  validateUser,
  getVendorProductExclusionById,
);

router.patch(
  "/:vendorProductId/exclusions/:exclusionId",
  validateUser,
  updateVendorProductExclusion,
);

router.delete(
  "/:vendorProductId/exclusions/:exclusionId",
  validateUser,
  deleteVendorProductExclusion,
);

module.exports = router;