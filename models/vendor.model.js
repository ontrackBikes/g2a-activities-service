const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

class Vendor extends Model {}

Vendor.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      comment: "Primary Key",
    },

    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Unique vendor code",
    },

    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: "SEO friendly slug",
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Vendor display name",
      validate: {
        notEmpty: true,
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Vendor description",
    },

    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Vendor logo",
    },

    contact_person: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Primary contact",
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Vendor email",
      validate: {
        isEmail: true,
      },
    },

    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Vendor phone",
    },

    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Vendor website",
    },

    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Display ordering",
      validate: {
        min: 0,
      },
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Active status",
    },
  },
  {
    sequelize,

    modelName: "Vendor",

    tableName: "vendors",

    freezeTableName: true,

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        unique: true,
        fields: ["slug"],
      },
      {
        fields: ["active"],
      },
      {
        fields: ["name"],
      },
      {
        fields: ["sort_order"],
      },
    ],
  },
);

module.exports = Vendor;