const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class BookingEstimate extends Model {}

BookingEstimate.init(
  {
    /**
     * Internal Primary Key
     */
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    /**
     * Public Estimate ID
     * Safe to expose to frontend
     */
    estimate_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    /**
     * Product
     */
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Booking Location
     */
    location_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Selected Vendor Product
     */
    vendor_product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Selected Vendor
     */
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Selected Inventory Schedule
     */
    vendor_schedule_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Public Slot Token
     *
     * Sent to frontend.
     * Example:
     * slot_7e6f8d2a
     */
    selected_slot_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    /**
     * Internal Slot
     *
     * Resolved from selected_slot_token.
     * Never exposed to frontend.
     */
    vendor_schedule_slot_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    /**
     * Booking Mode
     */
    booking_mode: {
      type: DataTypes.ENUM("single_date", "date_range", "open"),
      allowNull: false,
    },

    /**
     * Original Request
     *
     * {
     *   location_slug,
     *   travel_date,
     *   guests
     * }
     */
    request_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Normalized Booking
     *
     * {
     *   travel_date,
     *   pickup_date,
     *   return_date,
     *   guests,
     *   rental_days
     * }
     */
    booking_data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Calculated Pricing
     */
    pricing: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Exact quotation shown to customer.
     *
     * Used to rebuild checkout
     * without recalculation.
     */
    quotation: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Quotation Schema Version
     */
    quotation_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    /**
     * Internal Metadata
     *
     * Example:
     *
     * {
     *   slot_mapping: {
     *      "sl_xxx": 25,
     *      "sl_yyy": 31
     *   }
     * }
     */
    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Source
     */
    source: {
      type: DataTypes.ENUM("website", "mobile", "admin", "partner", "api"),
      allowNull: false,
      defaultValue: "website",
    },

    /**
     * Estimate Status
     */
    status: {
      type: DataTypes.ENUM(
        "draft",
        "confirmed",
        "expired",
        "converted",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "draft",
    },

    /**
     * Expiration
     */
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,

    modelName: "BookingEstimate",

    tableName: "booking_estimates",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["estimate_id"],
      },

      {
        fields: ["product_id"],
      },

      {
        fields: ["location_id"],
      },

      {
        fields: ["vendor_product_id"],
      },

      {
        fields: ["vendor_id"],
      },

      {
        fields: ["vendor_schedule_id"],
      },

      {
        fields: ["vendor_schedule_slot_id"],
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

      {
        fields: ["status", "expires_at"],
      },
    ],
  },
);

// BookingEstimate.sync({ alter: true });

module.exports = BookingEstimate;
