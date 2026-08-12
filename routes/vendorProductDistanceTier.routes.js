const express = require("express");

const {
  createDistanceTier,
  getDistanceTiers,
  getDistanceTier,
  updateDistanceTier,
  deleteDistanceTier,
} = require("../controllers/vendorProductDistanceTier.controller");
const { validateUser } = require("../middlewares/auth.middleware");

const router = express.Router({ mergeParams: true });

router.use(validateUser);

router.post(
  "/distance-tiers",
  createDistanceTier
);

router.get(
  "/distance-tiers",
  getDistanceTiers
);

router.get(
  "/distance-tiers/:tierId",
  getDistanceTier
);

router.patch(
  "/distance-tiers/:tierId",
  updateDistanceTier
);

router.delete(
  "/distance-tiers/:tierId",
  deleteDistanceTier
);

module.exports = router;
