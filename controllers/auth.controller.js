const bcrypt = require("bcryptjs");

const { AdminUser } = require("../models");
const { generateToken } = require("../services/jwt.service");
const { loginSchema, createUserSchema } = require("../schemas/auth.schema");

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
});

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await AdminUser.findOne({
      where: {
        username: value.username,
        active: true,
      },
    });

    const isPasswordValid = user
      ? await bcrypt.compare(value.password, user.password_hash)
      : false;

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = generateToken({
      sub: String(user.id),
      username: user.username,
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: serializeUser(user),
      },
    });
  } catch (error) {
    console.error("[AuthController] login", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const passwordHash = await bcrypt.hash(value.password, 12);

    const user = await AdminUser.create({
      username: value.username,
      password_hash: passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: serializeUser(user),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    console.error("[AuthController] createUser", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

module.exports = {
  login,
  createUser,
};
