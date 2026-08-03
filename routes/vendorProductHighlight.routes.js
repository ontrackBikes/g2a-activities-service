const router = require("express").Router();

const {
  createVendorProductHighlight,
  getVendorProductHighlights,
  getVendorProductHighlightById,
  updateVendorProductHighlight,
  deleteVendorProductHighlight,
} = require("../controllers/vendorProductHighlight.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/highlights",
  validateUser,
  createVendorProductHighlight,
);

router.get(
  "/:vendorProductId/highlights",
  validateUser,
  getVendorProductHighlights,
);

router.get(
  "/:vendorProductId/highlights/:highlightId",
  validateUser,
  getVendorProductHighlightById,
);

router.patch(
  "/:vendorProductId/highlights/:highlightId",
  validateUser,
  updateVendorProductHighlight,
);

router.delete(
  "/:vendorProductId/highlights/:highlightId",
  validateUser,
  deleteVendorProductHighlight,
);

module.exports = router;