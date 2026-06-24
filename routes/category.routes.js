const { createCategory } = require("../controllers/category.controller");
const express = require("express");
const router = express.Router();

router.post(
  "/",
  createCategory
);

module.exports = router;