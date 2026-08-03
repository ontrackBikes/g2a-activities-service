const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductCancellationPolicy extends Model {}

ProductCancellationPolicy.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    modelName: "ProductCancellationPolicy",
    tableName: "product_cancellation_policies",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["product_id"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["sort_order"],
      },
    ],
  },
);

module.exports = ProductCancellationPolicy;
