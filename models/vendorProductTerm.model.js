const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorProductTerm extends Model {}

VendorProductTerm.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    content: {
      type: DataTypes.TEXT,
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
    tableName: "vendor_product_terms",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = VendorProductTerm;
