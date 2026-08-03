const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const { generateOrderId } = require("../utils/shortId");

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
      type: DataTypes.STRING(16),
      allowNull: false,
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

    /**
     * Communication
     */
    email_confirmation_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
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
        fields: ["email_confirmation_sent_at"],
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

    hooks: {
      async beforeValidate(order) {
        if (order.order_id) return;

        const MAX_ATTEMPTS = 5;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const candidate = generateOrderId();
          // eslint-disable-next-line no-await-in-loop
          const existing = await Order.findOne({
            where: { order_id: candidate },
            attributes: ["id"],
          });
          if (!existing) {
            order.order_id = candidate;
            return;
          }
        }

        throw new Error(
          "Failed to generate a unique order_id after multiple attempts",
        );
      },
    },
  },
);

// Order.sync({ alter: true });

module.exports = Order;
