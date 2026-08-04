require("dotenv").config();

const bcrypt = require("bcryptjs");
const sequelize = require("../config/sequelize");
const { AdminUser } = require("../models");

const createAdminUser = async () => {
  const username = String(process.env.ADMIN_USERNAME || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!username || !password) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD must be set before creating an admin user.",
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }

  await sequelize.authenticate();

  const existingUser = await AdminUser.findOne({
    where: { username },
  });

  if (existingUser) {
    throw new Error("An admin user with this username already exists.");
  }

  await AdminUser.create({
    username,
    password_hash: await bcrypt.hash(password, 12),
    active: true,
  });

  console.log(`Admin user '${username}' created successfully.`);
};

createAdminUser()
  .catch((error) => {
    console.error("Failed to create admin user:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
