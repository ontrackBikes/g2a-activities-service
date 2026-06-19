const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorProductImage extends Model {}

VendorProductImage.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Vendor Product",
    },

    image_url: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Image URL",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Display ordering",
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Active status",
    },
  },
  {
    sequelize,

    modelName: "VendorProductImage",

    tableName: "vendor_product_images",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        fields: ["vendor_product_id"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["sort_order"],
      },
    ],
  },
);

module.exports = VendorProductImage;