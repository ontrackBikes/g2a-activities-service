const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Customer extends Model {}

Customer.init(
  {
    /**
     * Internal
     */
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    /**
     * Public
     */
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    mobile: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "active",
        "blocked",
      ),
      defaultValue: "active",
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,

    modelName: "Customer",

    tableName: "customers",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["customer_id"],
      },
      {
        fields: ["mobile"],
      },
      {
        fields: ["email"],
      },
    ],
  },
);

// Customer.sync({ alter: true });

module.exports = Customer;