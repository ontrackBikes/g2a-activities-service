const express = require("express");

const router = express.Router();

const {
  assignProductToCollection,
  deleteCollectionProduct,
} = require(
  "../controllers/productCollectionProduct.controller"
);

router.post(
  "/",
  assignProductToCollection
);

router.delete(
  "/:id",
  deleteCollectionProduct
);

module.exports = router;