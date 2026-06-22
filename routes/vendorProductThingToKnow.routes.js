const router = require("express").Router();

const {
  createVendorProductThingToKnow,
  getVendorProductThingsToKnow,
  getVendorProductThingToKnowById,
  updateVendorProductThingToKnow,
  deleteVendorProductThingToKnow,
} = require("../controllers/vendorProductThingToKnow.controller");

const {
  validateUser,
} = require("../middlewares/auth.middleware");

router.post(
  "/:vendorProductId/things-to-know",
  validateUser,
  createVendorProductThingToKnow,
);

router.get(
  "/:vendorProductId/things-to-know",
  validateUser,
  getVendorProductThingsToKnow,
);

router.get(
  "/:vendorProductId/things-to-know/:thingToKnowId",
  validateUser,
  getVendorProductThingToKnowById,
);

router.patch(
  "/:vendorProductId/things-to-know/:thingToKnowId",
  validateUser,
  updateVendorProductThingToKnow,
);

router.delete(
  "/:vendorProductId/things-to-know/:thingToKnowId",
  validateUser,
  deleteVendorProductThingToKnow,
);

module.exports = router;