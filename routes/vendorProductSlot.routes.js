const express = require("express");

const {
  createVendorProductSlot,
  getVendorProductSlots,
  getVendorProductSlot,
  updateVendorProductSlot,
  deleteVendorProductSlot,
} = require("../controllers/vendorProductSlot.controller");
const { validateUser } = require("../middlewares/auth.middleware");

const router = express.Router({ mergeParams: true });

router.use(validateUser);

router.post(
  "/slots",
  createVendorProductSlot
);

router.get(
  "/slots",
  getVendorProductSlots
);

router.get(
  "/slots/:slotId",
  getVendorProductSlot
);

router.patch(
  "/slots/:slotId",
  updateVendorProductSlot
);

router.delete(
  "/slots/:slotId",
  deleteVendorProductSlot
);

module.exports = router;
