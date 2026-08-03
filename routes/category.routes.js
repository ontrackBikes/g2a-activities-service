const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryBySlug,
} = require("../controllers/category.controller");
const express = require("express");
const router = express.Router();

router.post("/", createCategory);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.patch("/:id", updateCategory);

router.delete("/:id", deleteCategory);

router.get("/slug/:slug", getCategoryBySlug);

module.exports = router;
