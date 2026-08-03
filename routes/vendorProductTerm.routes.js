const router = require("express").Router();

const {
  createVendorProductTerm,
  getVendorProductTerms,
  getVendorProductTermById,
  updateVendorProductTerm,
  deleteVendorProductTerm,
} = require("../controllers/vendorProductTerm.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/terms",
  validateUser,
  createVendorProductTerm,
);

router.get(
  "/:vendorProductId/terms",
  validateUser,
  getVendorProductTerms,
);

router.get(
  "/:vendorProductId/terms/:termId",
  validateUser,
  getVendorProductTermById,
);

router.patch(
  "/:vendorProductId/terms/:termId",
  validateUser,
  updateVendorProductTerm,
);

router.delete(
  "/:vendorProductId/terms/:termId",
  validateUser,
  deleteVendorProductTerm,
);

module.exports = router;