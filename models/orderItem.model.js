const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class OrderItem extends Model {}

OrderItem.init(
  {
    /**
     * Internal
     */

    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    line_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },

    /**
     * Product Snapshot
     */

    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    product_slug: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    location_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    location_slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
     thumbnail_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Vendor Resolution
     */

    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    vendor_schedule_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    vendor_schedule_slot_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Booking
     */

    booking_mode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    booking_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    booking_payload: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Snapshot shown to customer
     */

    quotation: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    pricing: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    booking_template_version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    booking_template_id: {
      type: DataTypes.BIGINT.UNSIGNED,
    },

    /**
     * Status
     */

    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "completed",
        "cancelled",
      ),
      defaultValue: "pending",
    },
  },
  {
    sequelize,

    tableName: "order_items",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        fields: ["order_id"],
      },

      {
        fields: ["product_id"],
      },

      {
        fields: ["vendor_id"],
      },

      {
        fields: ["vendor_product_id"],
      },

      {
        fields: ["status"],
      },
    ],
  },
);

// OrderItem.sync({ alter: true });

module.exports = OrderItem;