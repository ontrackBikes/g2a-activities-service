const { createProductTag,
  getProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag } = require("../controllers/productTag.controller");

const express = require("express");
const { assignTagToProduct } = require("../controllers/productTagMapping.controller");
const router = express.Router();

router.post(
  "/",
  createProductTag
);

router.post("/", createProductTag);

router.get("/", getProductTags);

router.get("/:id", getProductTagById);

router.patch("/:id", updateProductTag);

router.delete("/:id", deleteProductTag);

router.post(
  "/assign",
  assignTagToProduct
);

module.exports = router;