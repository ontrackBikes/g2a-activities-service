const { createProductType } = require("../controllers/productType.controller");
const express = require("express");
const router = express.Router();

router.post(
  "/",
  createProductType
);

module.exports = router;