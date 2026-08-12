const express = require("express");
const router = express.Router();
const {
  searchGoogleLocations,
  getDistanceBetweenLocations,
} = require("../controllers/googleMaps.controller");
const {
  placesSearchLimiter,
  distanceLimiter,
} = require("../middlewares/rateLimit.middleware");

router.get("/search", placesSearchLimiter, searchGoogleLocations);

router.get("/distance", distanceLimiter, getDistanceBetweenLocations);

module.exports = router;
