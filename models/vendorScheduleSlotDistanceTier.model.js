const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorScheduleSlotDistanceTier extends Model {}

VendorScheduleSlotDistanceTier.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    vendor_schedule_slot_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Dated Vendor Schedule Slot",
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
      comment: "Flat fare for this tier, for this date",
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,

    modelName: "VendorScheduleSlotDistanceTier",

    tableName: "vendor_schedule_slot_distance_tiers",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        name: "vssdt_slot_id_min_km_unique",
        unique: true,
        fields: ["vendor_schedule_slot_id", "min_distance_km"],
      },
      {
        fields: ["vendor_schedule_slot_id"],
      },
    ],
  }
);

module.exports = VendorScheduleSlotDistanceTier;
