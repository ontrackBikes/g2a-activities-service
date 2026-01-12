const fs = require("fs");
const path = require("path");

function readJSON(file) {
  const filePath = path.join(__dirname, "..", "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

module.exports = { readJSON };
