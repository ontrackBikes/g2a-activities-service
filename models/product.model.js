const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Product extends Model {}

Product.init(
  {
    /**
     * Internal PK
     */
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    /**
     * Human-readable unique code
     * Example:
     * DSD_BOAT_DIVE_BASIC
     * AIRPORT_TRANSFER_PB
     */
    code: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },

    /**
     * URL Slug
     * Example:
     * dsd-boat-dive-basic
     */
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    /**
     * Product Name
     * Example:
     * DSD Boat Dive - Basic
     */
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    /**
     * Product Group
     *
     * Example:
     * DSD Boat Dive
     * Airport Transfer
     * Bike Rental
     */
    group_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Category
     *
     * Examples:
     * Water Sports
     * Day Trips
     * Getting Around
     */
    // category_id: {
    //   type: DataTypes.BIGINT.UNSIGNED,
    //   allowNull: false,
    // },

    /**
     * Product Type
     *
     * Examples:
     * Scuba Diving
     * Kayaking
     * Ferry
     * Rental
     */
    product_type_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Featured on homepage
     */
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    /**
     * Short summary
     */
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Desktop thumbnail
     */
    thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Mobile thumbnail
     */
    thumbnail_url_sm: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Search Keywords
     *
     * Example:
     * scuba, diving, havelock, beginner
     */
    search_keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Listing Order
     */
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    /**
     * Active / Inactive
     */
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
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
        fields: ["product_type_id"],
      },

      {
        fields: ["product_type_id", "active"],
      },

      {
        fields: ["featured", "active"],
      },

      {
        fields: ["sort_order"],
      },

      {
        fields: ["active"],
      },
      {
        fields: ["active", "sort_order"],
      },
      {
        fields: ["featured", "active", "sort_order"],
      },
    ],
  },
);

module.exports = Product;
