const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Category extends Model {}

Category.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    /**
     * Basic
     */
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    /**
     * Hero Section
     */
    cover_media_url: {
      type: DataTypes.STRING(500),
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

    /**
     * SEO
     */
    meta_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Display
     */
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "categories",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["slug"],
      },

      {
        fields: ["active"],
      },

      {
        fields: ["featured"],
      },

      {
        fields: ["sort_order"],
      },

      {
        fields: ["active", "sort_order"],
      },
    ],
  }
);
// Category.sync({alter: true})
module.exports = Category;