const router = require("express").Router();

const {
  createProductHighlight,
  getProductHighlights,
  getProductHighlightById,
  updateProductHighlight,
  deleteProductHighlight,
} = require("../controllers/productHighlight.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:productId/highlights",
  validateUser,
  createProductHighlight,
);

router.get(
  "/:productId/highlights",
  validateUser,
  getProductHighlights,
);

router.get(
  "/:productId/highlights/:highlightId",
  validateUser,
  getProductHighlightById,
);

router.patch(
  "/:productId/highlights/:highlightId",
  validateUser,
  updateProductHighlight,
);

router.delete(
  "/:productId/highlights/:highlightId",
  validateUser,
  deleteProductHighlight,
);

module.exports = router;