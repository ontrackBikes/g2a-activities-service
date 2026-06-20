const express = require("express");

const {
  createVendor,
  getVendors,
  getVendor,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendor.controller");

const router = express.Router();

router.post("/", createVendor);

router.get("/", getVendors);

router.get("/:id", getVendor);

router.patch("/:id", updateVendor);

router.delete("/:id", deleteVendor);

module.exports = router;