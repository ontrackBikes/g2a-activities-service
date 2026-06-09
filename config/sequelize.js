const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",

    logging:
      process.env.NODE_ENV === "development"
        ? console.log
        : false,

    define: {
      underscored: true,
    },

    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },

    dialectOptions: {
      charset: "utf8mb4",
    },
  }
);

module.exports = sequelize;