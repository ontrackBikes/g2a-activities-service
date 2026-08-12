const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorProductDistanceTier extends Model {}

VendorProductDistanceTier.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Vendor Product",
    },

    min_distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Distance threshold (km) this tier's flat fare applies above",
      validate: {
        min: 0,
      },
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Flat fare for this tier",
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Active Status",
    },
  },
  {
    sequelize,

    modelName: "VendorProductDistanceTier",

    tableName: "vendor_product_distance_tiers",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["vendor_product_id", "min_distance_km"],
      },
      {
        fields: ["vendor_product_id"],
      },
      {
        fields: ["active"],
      },
    ],
  }
);

module.exports = VendorProductDistanceTier;
