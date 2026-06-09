const Product = require("./product.model");
const ProductConfig = require("./productConfig.model");
const ProductContent = require("./productContent.model");
const Location = require("./location.model");
const ProductLocation = require("./productLocation.model");

/*
|--------------------------------------------------------------------------
| Associations
|--------------------------------------------------------------------------
*/

Product.hasOne(ProductConfig, {
  foreignKey: "product_id",
  as: "config",
});

ProductConfig.belongsTo(Product, {
  foreignKey: "product_id",
});

Product.hasOne(ProductContent, {
  foreignKey: "product_id",
  as: "content",
});

ProductContent.belongsTo(Product, {
  foreignKey: "product_id",
});

Product.belongsToMany(Location, {
  through: ProductLocation,
  foreignKey: "product_id",
  otherKey: "location_id",
  as: "locations",
});

Location.belongsToMany(Product, {
  through: ProductLocation,
  foreignKey: "location_id",
  otherKey: "product_id",
  as: "products",
});

module.exports = {
  Product,
  ProductConfig,
  ProductContent,
  Location,
  ProductLocation,
};