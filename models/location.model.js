const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Location extends Model {}

Location.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    display_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    image_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    type: {
      type: DataTypes.ENUM(
        "island",
        "city",
        "beach",
        "attraction",
        "jetty",
        "other"
      ),
      allowNull: false,
    },

    parent_location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Location",
    tableName: "locations",
    freezeTableName: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        unique: true,
        fields: ["slug"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["parent_location_id"],
      },
      {
        fields: ["sort_order"],
      },
      {
        fields: ["active"],
      },
    ],
  }
);

module.exports = Location;