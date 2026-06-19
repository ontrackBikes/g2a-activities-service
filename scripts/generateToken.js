require("dotenv").config();
const { generateToken } = require("../services/jwt.service");

const token = generateToken({
  id: 1,
  name: "Test User",
  role: "admin",
});

console.log("JWT TOKEN:\n");
console.log(token);