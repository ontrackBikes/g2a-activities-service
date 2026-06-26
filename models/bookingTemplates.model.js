const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class BookingTemplate extends Model {}

BookingTemplate.init(
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
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    product_page_schema: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    booking_page_schema: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "booking_templates",
    freezeTableName: true,
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["slug"],
      },
      {
        fields: ["active"],
      },
    ],
  }
);

module.exports = BookingTemplate;