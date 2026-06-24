const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductCollection extends Model {}

ProductCollection.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    banner_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * What is this collection for?
     *
     * global
     * category
     * product_type
     * location
     */
    entity_type: {
      type: DataTypes.ENUM(
        "global",
        "category",
        "product_type",
        "location"
      ),
      allowNull: false,
      defaultValue: "global",
    },

    /**
     * Points to category/product_type/location
     */
    entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "ProductCollection",
    tableName: "product_collections",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = ProductCollection;