const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class EmailLog extends Model {}

EmailLog.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    to_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    from_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    html_body: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },

    message_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    provider: {
      type: DataTypes.ENUM("postmark", "ses", "sendgrid"),
      defaultValue: "postmark",
    },

    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      defaultValue: "pending",
    },

    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },

    template: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    template_model: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,

    tableName: "email_logs",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",
  },
);
// EmailLog.sync({ alter: true });
module.exports = EmailLog;
