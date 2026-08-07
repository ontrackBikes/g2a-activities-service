const express = require("express");
const router = express.Router();
const {
  searchGoogleLocations,
} = require("../controllers/googleMaps.controller");
const {
  placesSearchLimiter,
} = require("../middlewares/rateLimit.middleware");

router.get("/search", placesSearchLimiter, searchGoogleLocations);

module.exports = router;
