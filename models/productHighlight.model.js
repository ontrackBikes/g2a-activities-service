const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductHighlight extends Model {}

ProductHighlight.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Product",
      references: {
        model: "products",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Highlight",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Display ordering",
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Active status",
    },
  },
  {
    sequelize,
    modelName: "ProductHighlight",
    tableName: "product_highlights",
    freezeTableName: true,

    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",

    engine: "InnoDB",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",

    indexes: [
      {
        name: "idx_product_highlights_product_id",
        fields: ["product_id"],
      },
      {
        name: "idx_product_highlights_active",
        fields: ["active"],
      },
      {
        name: "idx_product_highlights_sort_order",
        fields: ["sort_order"],
      },
    ],
  },
);

module.exports = ProductHighlight;