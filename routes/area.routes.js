const express = require("express");

const {
  createArea,
  getAreas,
  getAreaOptions,
  getArea,
  updateArea,
  deleteArea,
  getServiceArea,
  updateServiceArea,
} = require("../controllers/area.controller");

const router = express.Router();

router.post("/", createArea);

router.get("/", getAreas);

router.get("/options", getAreaOptions);

router.get("/:id", getArea);

router.patch("/:id", updateArea);

router.get("/:id/service-area", getServiceArea);

router.put("/:id/service-area", updateServiceArea);

router.delete("/:id", deleteArea);

module.exports = router;
