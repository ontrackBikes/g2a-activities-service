const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Document extends Model {}

Document.init(
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

    // Loose polymorphic reference (no FK) to whatever this document belongs
    // to, e.g. entity_type: "customer", entity_id: <customer id>.
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    entity_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    folder: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    file_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("active", "deleted"),
      allowNull: false,
      defaultValue: "active",
    },

    // When this document should be auto-deleted by the cleanup cron.
    // Null means it is kept forever.
    expires_at: {
      type: DataTypes.DATE,
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
    modelName: "Document",
    tableName: "documents",
    freezeTableName: true,
    timestamps: false,

    indexes: [
      { fields: ["entity_type", "entity_id"] },
      { fields: ["status"] },
      { fields: ["expires_at"] },
    ],
  },
);

module.exports = Document;
