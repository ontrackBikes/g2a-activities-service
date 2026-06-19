const express = require("express");
const { validateUser } = require("../middlewares/auth.middleware");

const {
  createProduct,
  getProductBySlug,
  getProducts,
  getAvailableAddons,
  updateProduct,
  patchProduct,
  addPricingOverride,
  updatePricingOverride,
  deletePricingOverride,
  getPricingOverrides,
  getPricingOverrideById,
  getProductById,
  searchProducts,
} = require("../controllers/product.controller");

const router = express.Router();

// routes/product.routes.js

router.post("/search", searchProducts);


/*
|--------------------------------------------------------------------------
| ADMIN APIS
|--------------------------------------------------------------------------
*/

router.get("/", getProducts);

router.get("/addons-available", getAvailableAddons);

/*
|--------------------------------------------------------------------------
| Pricing Overrides
|--------------------------------------------------------------------------
*/

router.get("/:id/pricing/overrides", getPricingOverrides);

router.get("/:id/pricing/overrides/:overrideId", getPricingOverrideById);

router.post("/:id/pricing/overrides", validateUser, addPricingOverride);

router.patch(
  "/:id/pricing/overrides/:overrideId",
  validateUser,
  updatePricingOverride,
);

router.delete(
  "/:id/pricing/overrides/:overrideId",
  validateUser,
  deletePricingOverride,
);

/*
|--------------------------------------------------------------------------
| Product CRUD
|--------------------------------------------------------------------------
*/
router.get("/:id", getProductById);

router.post("/", validateUser, createProduct);

router.put("/:id", validateUser, updateProduct);

router.patch("/:id", validateUser, patchProduct);

/*
|--------------------------------------------------------------------------
| Slug Route (Always Last)
|--------------------------------------------------------------------------
*/

router.get("/:slug", getProductBySlug);

module.exports = router;
