const Product = require("./product.model");
const ProductGroup = require("./productGroup.model");
const ProductImage = require("./productImages.model");
const Location = require("./location.model");
const Vendor = require("./vendor.model");
const VendorProduct = require("./vendorProduct.model");
const VendorProductImage = require("./vendorProductImage.model");
const VendorProductFaq = require("./vendorProductFaq.model");
const VendorProductTerm = require("./vendorProductTerm.model");
const VendorProductHighlight = require("./vendorProductHighlight.model");
const VendorProductInclusion = require("./vendorProductInclusion.model");
const VendorProductExclusion = require("./vendorProductExclusion.model");
const VendorProductThingToKnow = require("./vendorProductThingToKnow.model");
const VendorProductSlot = require("./vendorProductSlot.model");
const VendorSchedule = require("./vendorSchedules.model");
const VendorScheduleSlot = require("./vendorScheduleSlot.model");

ProductGroup.hasMany(Product, {
  foreignKey: "group_id",
  as: "products",
});

Product.belongsTo(ProductGroup, {
  foreignKey: "group_id",
  as: "group",
});

Product.hasMany(ProductImage, {
  foreignKey: "product_id",
  as: "images",
});

ProductImage.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Location.belongsTo(Location, {
  foreignKey: "parent_location_id",
  as: "parent",
});

Location.hasMany(Location, {
  foreignKey: "parent_location_id",
  as: "children",
});

Vendor.hasMany(VendorProduct, {
  foreignKey: "vendor_id",
  as: "vendorProducts",
});

VendorProduct.belongsTo(Vendor, {
  foreignKey: "vendor_id",
  as: "vendor",
});

Product.hasMany(VendorProduct, {
  foreignKey: "product_id",
  as: "vendorProducts",
});

VendorProduct.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Location.hasMany(VendorProduct, {
  foreignKey: "location_id",
  as: "vendorProducts",
});

VendorProduct.belongsTo(Location, {
  foreignKey: "location_id",
  as: "location",
});

VendorProduct.hasMany(VendorProductImage, {
  foreignKey: "vendor_product_id",
  as: "images",
});

VendorProductImage.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductFaq, {
  foreignKey: "vendor_product_id",
  as: "faqs",
});

VendorProductFaq.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductTerm, {
  foreignKey: "vendor_product_id",
  as: "terms",
});

VendorProductTerm.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductHighlight, {
  foreignKey: "vendor_product_id",
  as: "highlights",
});

VendorProductHighlight.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductInclusion, {
  foreignKey: "vendor_product_id",
  as: "inclusions",
});

VendorProductInclusion.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductExclusion, {
  foreignKey: "vendor_product_id",
  as: "exclusions",
});

VendorProductExclusion.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductThingToKnow, {
  foreignKey: "vendor_product_id",
  as: "thingsToKnow",
});

VendorProductThingToKnow.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorProductSlot, {
  foreignKey: "vendor_product_id",
  as: "slots",
});

VendorProductSlot.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorProduct.hasMany(VendorSchedule, {
  foreignKey: "vendor_product_id",
  as: "schedules",
});

VendorSchedule.belongsTo(VendorProduct, {
  foreignKey: "vendor_product_id",
  as: "vendorProduct",
});

VendorSchedule.hasMany(VendorScheduleSlot, {
  foreignKey: "vendor_schedule_id",
  as: "slots",
});

VendorScheduleSlot.belongsTo(VendorSchedule, {
  foreignKey: "vendor_schedule_id",
  as: "schedule",
});

VendorProductSlot.hasMany(VendorScheduleSlot, {
  foreignKey: "vendor_product_slot_id",
  as: "scheduleSlots",
});

VendorScheduleSlot.belongsTo(VendorProductSlot, {
  foreignKey: "vendor_product_slot_id",
  as: "templateSlot",
});



module.exports = {
  Product,
  ProductGroup,
  ProductImage,
  Location,
  Vendor, 
  VendorProduct,
  VendorProductImage,
  VendorProductFaq,
  VendorProductTerm,
  VendorProductHighlight,
  VendorProductInclusion,
  VendorProductExclusion,
  VendorProductThingToKnow,
  VendorProductSlot,
  VendorSchedule,
  VendorScheduleSlot
};