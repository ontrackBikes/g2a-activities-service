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

    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    original_file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    extension: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    folder: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    original_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    large_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    medium_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    thumb_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    timestamps: false,

    indexes: [
      { fields: ["folder"] },
      { fields: ["entity_type"] },
      { fields: ["active"] },
    ],
  },
);

module.exports = MediaLibrary;
