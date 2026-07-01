
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorScheduleSlot extends Model {}

VendorScheduleSlot.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    vendor_schedule_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Schedule",
    },

    vendor_product_slot_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      comment: "Template Slot",
    },

    slot_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Snapshot of slot name",
    },

    start_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Snapshot start time",
    },

    end_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Snapshot end time",
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Actual inventory price",
      validate: {
        min: 0,
      },
    },

    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Actual inventory capacity",
      validate: {
        min: 0,
      },
    },

    booked: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Booked count",
      validate: {
        min: 0,
      },
    },

    available: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Available count",
      validate: {
        min: 0,
      },
    },

    max_bookable_per_booking: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Booking limit per order",
      validate: {
        min: 0,
      },
    },

    status: {
      type: DataTypes.ENUM(
        "OPEN",
        "CLOSED",
        "DELETED"
      ),
      allowNull: false,
      defaultValue: "OPEN",
      comment: "Slot status",
    },

    allow_sync_updates: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Worker may modify this slot",
    },
  },
  {
    sequelize,

    modelName: "VendorScheduleSlot",

    tableName: "vendor_schedule_slots",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: [
          "vendor_schedule_id",
          "vendor_product_slot_id",
        ],
      },
      {
        fields: ["vendor_schedule_id"],
      },
      {
        fields: ["vendor_product_slot_id"],
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
//VendorScheduleSlot.sync({alter: true})
module.exports = VendorScheduleSlot;
