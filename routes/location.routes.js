const express = require("express");

const {
  createLocation,
  getLocations,
  getLocation,
  getLocationTree,
  getLocationOptions,
  updateLocation,
  deleteLocation,
  permanentlyDeleteLocation,
  getLocationApp,
  getServiceArea,
  updateServiceArea,
} = require("../controllers/location.controller");

const router = express.Router();

router.post("/", createLocation);

router.get("/", getLocations);

router.get("/tree", getLocationTree);

router.get("/options", getLocationOptions);

router.get("/:id", getLocation);

router.patch("/:id", updateLocation);

router.get("/:id/service-area", getServiceArea);

router.put("/:id/service-area", updateServiceArea);

router.delete("/:id/permanent", permanentlyDeleteLocation);

router.delete("/:id", deleteLocation);

router.get("/app/:slug", getLocationApp);

module.exports = router;
