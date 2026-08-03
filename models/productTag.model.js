const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductTag extends Model {}

ProductTag.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    color: {
      type: DataTypes.STRING(30),
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
    modelName: "ProductTag",
    tableName: "product_tags",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      { unique: true, fields: ["slug"] },
      { fields: ["active"] },
      { fields: ["sort_order"] },
    ],
  },
);

module.exports = ProductTag;