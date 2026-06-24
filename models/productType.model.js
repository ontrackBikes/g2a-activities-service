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


    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
      {
        fields: ["category_id", "active"],
      },
    ],
  },
);

module.exports = ProductType;