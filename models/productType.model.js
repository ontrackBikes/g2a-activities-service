const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductType extends Model {}

ProductType.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    category_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Example:
     * Scuba Diving
     * Kayaking
     * Day Trip
     * Ferry
     * Transfer
     */
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    /**
     * Example:
     * scuba-diving
     * kayaking
     * day-trip
     */
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    /**
     * Display order
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

    cover_media_url: {
       type: DataTypes.STRING(150),
      allowNull: true,
    },

    cover_title: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    cover_subtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ProductType",
    tableName: "product_types",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["category_id", "slug"],
      },
      {
        fields: ["category_id"],
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
// ProductType.sync({alter: true})
module.exports = ProductType;
