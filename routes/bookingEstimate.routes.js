const express = require("express");
const { getEstimate, selectEstimateSlot } = require("../controllers/bookingEstimate.controller");

const router = express.Router();


router.get(
  "/:estimate_id",
  getEstimate,
);

router.post(
  "/:estimate_id/select-slot",
  selectEstimateSlot,
);

module.exports = router;
