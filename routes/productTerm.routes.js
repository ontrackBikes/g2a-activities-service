const express = require("express");

const {
  createProductTerm,
  getProductTerms,
  updateProductTerm,
  deleteProductTerm,
} = require("../controllers/productTerm.controller");

const router = express.Router();

router.post("/", createProductTerm);

router.get(
  "/product/:product_id",
  getProductTerms
);

router.patch(
  "/:id",
  updateProductTerm
);

router.delete(
  "/:id",
  deleteProductTerm
);

module.exports = router;