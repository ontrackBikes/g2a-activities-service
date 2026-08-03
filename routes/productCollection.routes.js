const express = require("express");

const router = express.Router();

const {
  createProductCollection,
  getProductCollections,
  getProductCollectionById,
  updateProductCollection,
  deleteProductCollection,
  getCollectionsWithProducts,
} = require(
  "../controllers/productCollection.controller"
);
const { getProductsListForApp } = require("../controllers/product.controller");

router.post(
  "/",
  createProductCollection
);

router.get(
  "/",
  getProductCollections
);

router.get(
  "/with-products",
  getCollectionsWithProducts
);



router.get(
  "/:id",
  getProductCollectionById
);

router.patch(
  "/:id",
  updateProductCollection
);

router.delete(
  "/:id",
  deleteProductCollection
);




module.exports = router;