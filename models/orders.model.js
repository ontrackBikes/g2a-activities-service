const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Order extends Model {}

Order.init(
  {
    /**
     * Internal PK
     */
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    /**
     * Public Order ID
     */
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    /**
     * Source Estimate
     */
    estimate_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    /**
     * Customer
     */
    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Snapshot
     */
    customer_details: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Pricing
     */
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "INR",
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    grand_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    /**
     * Payment
     */

    payment_status: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "failed",
        "partially_refunded",
        "refunded",
      ),
      defaultValue: "pending",
    },

    /**
     * Order Status
     */

    order_status: {
      type: DataTypes.ENUM(
        "draft",
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
      ),
      defaultValue: "draft",
    },

    /**
     * Internal
     */

    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,

    tableName: "orders",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["order_id"],
      },

      {
        fields: ["estimate_id"],
      },

      {
        fields: ["customer_id"],
      },

      {
        fields: ["payment_status"],
      },

      {
        fields: ["order_status"],
      },
    ],
  },
);

// Order.sync({ alter: true });

module.exports = Order;