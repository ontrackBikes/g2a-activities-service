const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class MediaLibrary extends Model {}

MediaLibrary.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    folder: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    original_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    relative_path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },

    width: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    height: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    extension: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "MediaLibrary",
    tableName: "media_library",
    freezeTableName: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",

    indexes: [
      { fields: ["folder"] },
      { fields: ["entity_type"] },
      { fields: ["active"] },
    ],
  },
);

module.exports = MediaLibrary;