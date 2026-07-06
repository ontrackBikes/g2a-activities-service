const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Payment extends Model {}

Payment.init(
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
     * Public Payment ID
     */
    payment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    /**
     * Order
     */
    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Gateway
     */
    gateway: {
      type: DataTypes.ENUM(
        "razorpay",
        "cashfree",
        "stripe",
        "manual",
      ),
      allowNull: false,
      defaultValue: "razorpay",
    },

    /**
     * Gateway IDs
     */
    gateway_order_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    gateway_payment_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    gateway_signature: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    /**
     * Pricing Snapshot
     */
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "INR",
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    /**
     * Gateway Response
     */
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Status
     */
    status: {
      type: DataTypes.ENUM(
        "pending",
        "authorized",
        "captured",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    /**
     * Failure
     */
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /**
     * Expiry
     */
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /**
     * Paid
     */
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
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

    modelName: "Payment",

    tableName: "payments",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["payment_id"],
      },

      {
        fields: ["order_id"],
      },

      {
        fields: ["gateway"],
      },

      {
        fields: ["gateway_order_id"],
      },

      {
        fields: ["gateway_payment_id"],
      },

      {
        fields: ["status"],
      },

      {
        fields: ["expires_at"],
      },

      {
        fields: ["created_at"],
      },
    ],
  },
);

// Payment.sync({ alter: true });

module.exports = Payment;