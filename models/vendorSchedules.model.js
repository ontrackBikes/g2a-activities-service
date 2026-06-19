const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorSchedule extends Model {}

VendorSchedule.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    schedule_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "OPEN",
        "CLOSED",
        "BLACKED_OUT"
      ),
      allowNull: false,
      defaultValue: "OPEN",
    },

    allow_sync_updates: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    sync_last_run_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,

    modelName: "VendorSchedule",

    tableName: "vendor_schedules",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: [
          "vendor_product_id",
          "schedule_date",
        ],
      },
      {
        fields: ["schedule_date"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["allow_sync_updates"],
      },
    ],
  }
);

module.exports = VendorSchedule;