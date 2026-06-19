const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class ProductGroup extends Model {}

ProductGroup.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,

    modelName: "ProductGroup",

    tableName: "product_groups",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["slug"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["sort_order"],
      },
      {
        fields: ["name"],
      },
    ],
  }
);

module.exports = ProductGroup;