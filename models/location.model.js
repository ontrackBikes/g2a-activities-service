const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Location extends Model {}

Location.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Location name",
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: "SEO friendly slug",
    },

    location_type: {
      type: DataTypes.ENUM(
        "island",
        "city",
        "jetty",
        "beach",
        "attraction",
        "other"
      ),
      allowNull: false,
      comment: "Location type",
    },

    parent_location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      comment: "Parent location",
    },

    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: "Latitude",
      validate: {
        min: -90,
        max: 90,
      },
    },

    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: "Longitude",
      validate: {
        min: -180,
        max: 180,
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

    modelName: "Location",

    tableName: "locations",

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
        fields: ["location_type"],
      },
      {
        fields: ["parent_location_id"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["name"],
      },
    ],
  }
);
// Location.sync({alter: true})
module.exports = Location;