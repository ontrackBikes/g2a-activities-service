const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Product extends Model {}

Product.init(
  {
    // Internal PK
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    // Human readable code
    // Example: DSD_BOAT_DIVE_BASIC
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    // URL slug
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    // Product Name
    // Example: DSD Boat Dive - Basic
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Product Group
    // Example:
    // DSD Boat Dive
    // Airport Transfer
    // Bike Rental
    group_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    // activity
    // rental
    // transfer
    // ferry
    // tour
    // experience
    product_type: {
      type: DataTypes.ENUM(
        "activity",
        "rental",
        "transfer",
        "ferry",
        "tour",
        "experience",
      ),
      allowNull: false,
    },

    // Scuba Diving
    // Water Sports
    // Transfers
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Mobile listing image
    thumbnail_url_sm: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Future search optimization
    search_keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        unique: true,
        fields: ["slug"],
      },
      {
        fields: ["group_id"],
      },
      {
        fields: ["product_type"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["active"],
      },
    ],
  },
);

module.exports = Product;