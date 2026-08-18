const Product = require("./product.model");
const ProductGroup = require("./productGroup.model");
const ProductImage = require("./productImages.model");
const Location = require("./location.model");
const Area = require("./area.model");
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
const VendorProductDistanceTier = require("./vendorProductDistanceTier.model");
const VendorSchedule = require("./vendorSchedules.model");
const VendorScheduleSlot = require("./vendorScheduleSlot.model");
const VendorScheduleSlotDistanceTier = require("./vendorScheduleSlotDistanceTier.model");
const ProductFaq = require("./productFaq.model");
const ProductTerm = require("./productTerm.model");
const ProductHighlight = require("./productHighlight.model");
const ProductInclusion = require("./productInclusion.model");
const ProductExclusion = require("./productExclusion.model");
const ProductThingToKnow = require("./productThingToKnow.model");
const ProductCancellationPolicy = require("./productCancellationPolicy.model");
const MediaLibrary = require("./mediaLibrary.model");
const Document = require("./document.model");
const ProductTag = require("./productTag.model");
const ProductTagMapping = require("./productTagMapping.model");
const ProductType = require("./productType.model");
const Category = require("./category.model");
const ProductCollection = require("./productCollection.model");
const ProductCollectionProduct = require("./productCollectionProduct.model");
const BookingTemplate = require("./bookingTemplates.model");
const Order = require("./orders.model");
const OrderItem = require("./orderItem.model");
const Customer = require("./customer.model");
const OrderParticipant = require("./orderParticipant.model");
const Payment = require("./payment.model");
const AdminUser = require("./adminUser.model");

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

Area.hasMany(Location, {
  foreignKey: "area_id",
  as: "locations",
});

Location.belongsTo(Area, {
  foreignKey: "area_id",
  as: "area",
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

VendorProduct.hasMany(VendorProductDistanceTier, {
  foreignKey: "vendor_product_id",
  as: "distanceTiers",
});

VendorProductDistanceTier.belongsTo(VendorProduct, {
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

VendorScheduleSlot.hasMany(VendorScheduleSlotDistanceTier, {
  foreignKey: "vendor_schedule_slot_id",
  as: "distanceTiers",
});

VendorScheduleSlotDistanceTier.belongsTo(VendorScheduleSlot, {
  foreignKey: "vendor_schedule_slot_id",
  as: "scheduleSlot",
});

Product.hasMany(ProductFaq, {
  foreignKey: "product_id",
  as: "faqs",
  onDelete: "CASCADE",
});

ProductFaq.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductTerm, {
  foreignKey: "product_id",
  as: "terms",
  onDelete: "CASCADE",
});

ProductTerm.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductHighlight, {
  foreignKey: "product_id",
  as: "highlights",
  onDelete: "CASCADE",
});

ProductHighlight.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductInclusion, {
  foreignKey: "product_id",
  as: "inclusions",
  onDelete: "CASCADE",
});

ProductInclusion.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductExclusion, {
  foreignKey: "product_id",
  as: "exclusions",
  onDelete: "CASCADE",
});

ProductExclusion.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductThingToKnow, {
  foreignKey: "product_id",
  as: "thingsToKnow",
  onDelete: "CASCADE",
});

ProductThingToKnow.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.hasMany(ProductCancellationPolicy, {
  foreignKey: "product_id",
  as: "cancellationPolicies",
  onDelete: "CASCADE",
});

ProductCancellationPolicy.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

/**
 * Product Type -> Products
 */
ProductType.hasMany(Product, {
  foreignKey: "product_type_id",
  as: "products",
});

Product.belongsTo(ProductType, {
  foreignKey: "product_type_id",
  as: "productType",
});

/**
 * Product <-> Tags
 */
Product.belongsToMany(ProductTag, {
  through: ProductTagMapping,
  foreignKey: "product_id",
  otherKey: "tag_id",
  as: "tags",
});

ProductTag.belongsToMany(Product, {
  through: ProductTagMapping,
  foreignKey: "tag_id",
  otherKey: "product_id",
  as: "products",
});

Product.hasMany(ProductTagMapping, {
  foreignKey: "product_id",
  as: "tagMappings",
  onDelete: "CASCADE",
});

ProductTagMapping.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

ProductTag.hasMany(ProductTagMapping, {
  foreignKey: "tag_id",
  as: "tagMappings",
  onDelete: "CASCADE",
});

ProductTagMapping.belongsTo(ProductTag, {
  foreignKey: "tag_id",
  as: "tag",
});

/**
 * Category -> Product Types
 */
Category.hasMany(ProductType, {
  foreignKey: "category_id",
  as: "productTypes",
});

ProductType.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

ProductCollection.hasMany(ProductCollectionProduct, {
  foreignKey: "collection_id",
  as: "productMappings",
  onDelete: "CASCADE",
});

ProductCollectionProduct.belongsTo(ProductCollection, {
  foreignKey: "collection_id",
  as: "collection",
});

Product.hasMany(ProductCollectionProduct, {
  foreignKey: "product_id",
  as: "collectionMappings",
  onDelete: "CASCADE",
});

ProductCollectionProduct.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

Product.belongsToMany(ProductCollection, {
  through: ProductCollectionProduct,
  foreignKey: "product_id",
  otherKey: "collection_id",
  as: "collections",
});

ProductCollection.belongsToMany(Product, {
  through: ProductCollectionProduct,
  foreignKey: "collection_id",
  otherKey: "product_id",
  as: "productsList",
});

BookingTemplate.hasMany(Product, {
  foreignKey: "booking_template_id",
  as: "products",
});

Product.belongsTo(BookingTemplate, {
  foreignKey: "booking_template_id",
  as: "bookingTemplate",
});


Order.hasMany(OrderItem, {
  foreignKey: "order_id",
  as: "items",
  onDelete: "CASCADE",
});

OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

Order.belongsTo(Customer, {
  foreignKey: "customer_id",
  as: "customer",
});

Customer.hasMany(Order, {
  foreignKey: "customer_id",
  as: "orders",
});

Order.hasMany(OrderParticipant, {
  foreignKey: "order_id",
  as: "participants",
  onDelete: "CASCADE",
});

OrderParticipant.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

OrderItem.hasMany(OrderParticipant, {
  foreignKey: "order_item_id",
  as: "participants",
  onDelete: "CASCADE",
});

OrderParticipant.belongsTo(OrderItem, {
  foreignKey: "order_item_id",
  as: "orderItem",
});

Order.hasMany(Payment, {
  foreignKey: "order_id",
  as: "payments",
});

Payment.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

module.exports = {
  Product,
  ProductGroup,
  ProductImage,
  Location,
  Area,
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
  VendorProductDistanceTier,
  VendorSchedule,
  VendorScheduleSlot,
  VendorScheduleSlotDistanceTier,
  ProductFaq,
  ProductTerm,
  ProductHighlight,
  ProductInclusion,
  ProductExclusion,
  ProductThingToKnow,
  ProductCancellationPolicy,
  MediaLibrary,
  Document,
  ProductTag,
  ProductTagMapping,
  ProductType,
  Category,
  ProductCollection,
  ProductCollectionProduct,
  BookingTemplate,
  Order,
  OrderItem,
  OrderParticipant,
  Customer,
  Payment,
  AdminUser
};
