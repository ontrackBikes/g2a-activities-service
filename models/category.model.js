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

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
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
    modelName: "Category",
    tableName: "categories",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      { unique: true, fields: ["slug"] },
      { fields: ["active"] },
      { fields: ["sort_order"] },
      { fields: ["active", "sort_order"] },
    ],
  },
);

module.exports = Category;