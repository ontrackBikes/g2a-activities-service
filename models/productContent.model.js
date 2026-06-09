const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductContent extends Model {}

ProductContent.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      unique: true,
    },

    sections: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    seo_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    seo_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ProductContent",
    tableName: "product_contents",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = ProductContent;