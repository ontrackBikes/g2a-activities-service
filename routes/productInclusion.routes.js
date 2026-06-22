const router = require("express").Router();

const {
  createProductInclusion,
  getProductInclusions,
  getProductInclusionById,
  updateProductInclusion,
  deleteProductInclusion,
} = require("../controllers/productInclusion.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:productId/inclusions",
  validateUser,
  createProductInclusion,
);

router.get(
  "/:productId/inclusions",
  validateUser,
  getProductInclusions,
);

router.get(
  "/:productId/inclusions/:inclusionId",
  validateUser,
  getProductInclusionById,
);

router.patch(
  "/:productId/inclusions/:inclusionId",
  validateUser,
  updateProductInclusion,
);

router.delete(
  "/:productId/inclusions/:inclusionId",
  validateUser,
  deleteProductInclusion,
);

module.exports = router;