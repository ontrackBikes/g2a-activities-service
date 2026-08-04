const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class AdminUser extends Model {}

AdminUser.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },

    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "AdminUser",
    tableName: "admin_users",
    freezeTableName: true,

    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["username"],
      },
      {
        fields: ["active"],
      },
    ],
  },
);

module.exports = AdminUser;
