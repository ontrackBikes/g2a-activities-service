const router = require("express").Router();

const {
  createProductCancellationPolicy,
  getProductCancellationPolicies,
  getProductCancellationPolicyById,
  updateProductCancellationPolicy,
  deleteProductCancellationPolicy,
} = require("../controllers/productCancellationPolicy.controller");
const { validateUser } = require("../middlewares/auth.middleware");

router.post(
  "/:productId/cancellation-policies",
  validateUser,
  createProductCancellationPolicy,
);

router.get(
  "/:productId/cancellation-policies",
  validateUser,
  getProductCancellationPolicies,
);

router.get(
  "/:productId/cancellation-policies/:policyId",
  validateUser,
  getProductCancellationPolicyById,
);

router.patch(
  "/:productId/cancellation-policies/:policyId",
  validateUser,
  updateProductCancellationPolicy,
);

router.delete(
  "/:productId/cancellation-policies/:policyId",
  validateUser,
  deleteProductCancellationPolicy,
);

module.exports = router;
