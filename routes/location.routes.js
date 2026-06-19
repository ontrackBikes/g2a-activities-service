// routes/location.routes.js

const {
  createLocation,
  getLocations,
  getLocationById,
} = require("../controllers/location.controller");
const { validateUser } = require("../middlewares/auth.middleware");

const router = require("express").Router();

router.post("/", validateUser, createLocation);

router.get("/", validateUser, getLocations);

router.get("/:id", validateUser, getLocationById);

module.exports = router;
