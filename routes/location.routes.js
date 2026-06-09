// routes/location.routes.js

const {
  createLocation,
  getLocations,
  getLocationById,
} = require("../controllers/location.controller");

const router = require("express").Router();

router.post("/", createLocation);

router.get("/", getLocations);

router.get("/:id", getLocationById);

module.exports = router;
