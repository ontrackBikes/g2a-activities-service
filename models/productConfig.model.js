const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductConfig extends Model {}

ProductConfig.init(
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

    pricing: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        currency: "INR",
        basePrice: 0,
        overrides: [],
      },
    },

    availability: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        enabled: true,
        minQuantity: 1,
        maxQuantity: 10,
        operatingDays: [],
        blackoutDates: [],
      },
    },

    booking_schema: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    recommendation_rules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    addon_rules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },

    source_rules: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: "ProductConfig",
    tableName: "product_configs",
    freezeTableName: true,
    timestamps: true,
  }
);

module.exports = ProductConfig;