const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Area extends Model {}

Area.init(
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
      comment: "Area name, e.g. Andaman & Nicobar Islands",
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: "SEO friendly slug",
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

    service_area: {
      type: DataTypes.JSON,
      allowNull: true,
      comment:
        "Serviceability boundary as an array of {lat,lng} polygon vertices, used to scope /places/search results to this area",
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

    modelName: "Area",

    tableName: "areas",

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
    ],
  }
);

module.exports = Area;
