const { createProductTag,
  getProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag, 
  getProductTagsAPI} = require("../controllers/productTag.controller");

const express = require("express");
const { assignTagToProduct, getProductsByTag, removeTagFromProduct } = require("../controllers/productTagMapping.controller");
const router = express.Router();

router.post(
  "/",
  createProductTag
);

router.post("/", createProductTag);

router.get("/", getProductTags);
router.get("/api", getProductTagsAPI);
router.get("/:id", getProductTagById);

router.patch("/:id", updateProductTag);

router.delete("/:id", deleteProductTag);

router.post(
  "/assign",
  assignTagToProduct
);

router.get(
  "/:id/products",
  getProductsByTag
);

router.delete(
  "/assign/:mappingId",
  removeTagFromProduct
);

module.exports = router;