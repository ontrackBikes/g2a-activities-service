const ProductService = require("../services/productService");

exports.getProducts = (req, res) => {
  res.json(ProductService.getAllProducts());
};

exports.getProductByType = (req, res) => {
  const product = ProductService.getProductByType(req.params.type);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
};

// Get bike rental locations
exports.getBikeRentalLocations = (req, res) => {
  res.json(ProductService.getBikeRentalLocations());
};

// Get bike rental summary
exports.getBikeRentalSummary = (req, res) => {
  res.json(ProductService.getRentalLocationsSummary());
};
