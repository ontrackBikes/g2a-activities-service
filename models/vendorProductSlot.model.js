const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class VendorProductSlot extends Model {}

VendorProductSlot.init(
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

    slot_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      set(value) {
        this.setDataValue(
          "slot_name",
          value?.trim()
        );
      },
    },

    slot_type: {
      type: DataTypes.ENUM("TIME", "VARIANT"),
      allowNull: false,
      defaultValue: "TIME",
      comment: "TIME for timed activity slots, VARIANT for vehicle/equipment variants",
      set(value) {
        this.setDataValue(
          "slot_type",
          value ? String(value).toUpperCase() : value,
        );
      },
    },

    start_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Slot Start Time",
    },

    end_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: "Slot End Time",
    },

    default_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Default Price",
      validate: {
        min: 0,
      },
    },

    default_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Default Capacity",
      validate: {
        min: 0,
      },
    },

    max_bookable_per_booking: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Maximum units allowed per booking",
      validate: {
        min: 0,
      },
    },

    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Slot duration in minutes (optional)",
      validate: {
        min: 0,
      },
    },

    priced_by: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Pricing unit label, e.g. guest, quantity, bike",
    },

    is_preferred: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Marks this slot as the preferred timing",
    },

    is_start_time_only: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Display as a start-only timing (e.g. Start @9am) instead of a range",
    },

    is_for_non_indian: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Marks this slot as reserved for non-Indian nationals only",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Display Ordering",
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

    modelName: "VendorProductSlot",

    tableName: "vendor_product_slots",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["vendor_product_id", "slot_name"],
      },
      {
        fields: ["vendor_product_id"],
      },
      {
        fields: ["slot_type"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["sort_order"],
      },
    ],
  }
);
// VendorProductSlot.sync({ alter: true })
module.exports = VendorProductSlot;
