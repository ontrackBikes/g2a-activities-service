const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductTagMapping extends Model {}

ProductTagMapping.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
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

    tag_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: "product_tags",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "ProductTagMapping",
    tableName: "product_tag_mappings",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["product_id", "tag_id"],
      },
      {
        fields: ["product_id"],
      },
      {
        fields: ["tag_id"],
      },
      {
        fields: ["product_id", "sort_order"],
      },
      {
        fields: ["tag_id", "sort_order"],
      },
    ],
  },
);

module.exports = ProductTagMapping;
