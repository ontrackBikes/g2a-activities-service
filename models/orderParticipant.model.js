const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class OrderParticipant extends Model {}

OrderParticipant.init(
  {
    /**
     * Internal
     */
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    /**
     * Relations
     */

    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    order_item_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    /**
     * Participant
     */

    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    age: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    nationality: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    /**
     * Physical Details
     */

    height: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },

    weight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },

    shoe_size: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    /**
     * Identity
     */

    passport_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    id_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    /**
     * Ferry
     */

    seat_preference: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    seat_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    /**
     * Medical
     */

    medical_declaration: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Emergency Contact
     */

    emergency_contact: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    /**
     * Extra future fields
     */

    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,

    modelName: "OrderParticipant",

    tableName: "order_participants",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        fields: ["order_id"],
      },
      {
        fields: ["order_item_id"],
      },
      {
        fields: ["passport_number"],
      },
    ],
  },
);

// OrderParticipant.sync({ alter: true });

module.exports = OrderParticipant;