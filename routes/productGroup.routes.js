const express = require("express");

const {
  createProductGroup,
  getProductGroups,
  getProductGroup,
  updateProductGroup,
  deleteProductGroup,
} = require("../controllers/productGroup.controller");

const router = express.Router();

router.post("/", createProductGroup);

router.get("/", getProductGroups);

router.get("/:id", getProductGroup);

router.patch("/:id", updateProductGroup);

router.delete("/:id", deleteProductGroup);

module.exports = router;