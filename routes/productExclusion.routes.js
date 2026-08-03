const router = require("express").Router();

const {
  createProductExclusion,
  getProductExclusions,
  getProductExclusionById,
  updateProductExclusion,
  deleteProductExclusion,
} = require("../controllers/productExclusion.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:productId/exclusions",
  validateUser,
  createProductExclusion,
);

router.get(
  "/:productId/exclusions",
  validateUser,
  getProductExclusions,
);

router.get(
  "/:productId/exclusions/:exclusionId",
  validateUser,
  getProductExclusionById,
);

router.patch(
  "/:productId/exclusions/:exclusionId",
  validateUser,
  updateProductExclusion,
);

router.delete(
  "/:productId/exclusions/:exclusionId",
  validateUser,
  deleteProductExclusion,
);

module.exports = router;