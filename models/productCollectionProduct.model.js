const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductCollectionProduct extends Model {}

ProductCollectionProduct.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    collection_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "ProductCollectionProduct",
    tableName: "product_collection_products",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["collection_id", "product_id"],
      },
      {
  fields: ["collection_id", "sort_order"],
}
    ],
  }
);

module.exports = ProductCollectionProduct;