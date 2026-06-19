const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductLocation extends Model {}

ProductLocation.init(
  {
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
    },

    location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: "ProductLocation",
    tableName: "product_locations",
    freezeTableName: true,
    timestamps: false,
  }
);

module.exports = ProductLocation;