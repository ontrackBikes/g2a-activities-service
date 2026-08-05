const Joi = require("joi");

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
});

const createUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(100).required(),
  password: Joi.string().min(8).max(128).required(),
});

module.exports = {
  loginSchema,
  createUserSchema,
};
