const express = require("express");
const { getEstimate, selectEstimateSlot, uploadKyc } = require("../controllers/bookingEstimate.controller");
const uploadMiddleware = require("../middlewares/documentUpload.middleware");

const router = express.Router();


router.get(
  "/:estimate_id",
  getEstimate,
);

router.post(
  "/:estimate_id/select-slot",
  selectEstimateSlot,
);

router.post(
  "/:estimate_id/upload-kyc",
  uploadMiddleware.single("file"),
  uploadKyc,
);

module.exports = router;
