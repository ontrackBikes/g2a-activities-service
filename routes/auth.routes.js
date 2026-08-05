const express = require("express");

const {
  login,
  createUser,
} = require("../controllers/auth.controller");
const { validateUser } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", login);
router.post("/users", validateUser, createUser);

module.exports = router;
