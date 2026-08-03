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

    media_type: {
      type: DataTypes.ENUM("image", "video"),
      allowNull: true,
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

    duration_seconds: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    video_codec: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    audio_codec: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    bitrate: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    frame_rate: {
      type: DataTypes.DECIMAL(8, 2),
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

    optimized_url: {
      type: DataTypes.TEXT,
      allowNull: true,
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

    processing_status: {
      type: DataTypes.ENUM("queued", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "queued",
    },

    processing_error: {
      type: DataTypes.TEXT,
      allowNull: true,
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
      { fields: ["media_type"] },
      { fields: ["processing_status"] },
    ],
  },
);

module.exports = MediaLibrary;
