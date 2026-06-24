const { createProductTag } = require("../controllers/productTag.controller");

const express = require("express");
const { assignTagToProduct } = require("../controllers/productTagMapping.controller");
const router = express.Router();

router.post(
  "/",
  createProductTag
);

router.post(
  "/assign",
  assignTagToProduct
);

module.exports = router;