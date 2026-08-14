const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorProduct extends Model {}

VendorProduct.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    pricing_type: {
      type: DataTypes.ENUM(
        "FIXED",
        "SLOT",
        "KM_BASED"
      ),
      allowNull: false,
    },

    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0,
      },
    },

    base_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    max_bookable_per_booking: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1,
      },
    },

    maintain_inventory_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 90,
      validate: {
        min: 0,
      },
    },

    min_booking_lead_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,

    modelName: "VendorProduct",

    tableName: "vendor_products",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: [
          "vendor_id",
          "product_id",
          "location_id",
        ],
      },

      {
        fields: ["vendor_id"],
      },

      {
        fields: ["product_id"],
      },

      {
        fields: ["location_id"],
      },

      {
        fields: ["pricing_type"],
      },

      {
        fields: ["active"],
      },
    ],
  }
);
//VendorProduct.sync({alter: true})
module.exports = VendorProduct;
