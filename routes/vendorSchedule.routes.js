const express = require("express");

const {
  createVendorSchedules,
  createVendorScheduleSlotsForDates,
  getVendorSchedules,
  getVendorSchedule,
  updateVendorSchedule,
  updateVendorScheduleSlot,
  bulkUpdateVendorScheduleSlots,
  deleteVendorSchedule,
  getVendorProductCalendar,
  syncVendorProductSchedules,
  getScheduleSlotDistanceTiers,
  replaceScheduleSlotDistanceTiers,
} = require("../controllers/vendorSchedule.controller");
const { validateUser } = require("../middlewares/auth.middleware");

const router = express.Router({
  mergeParams: true,
});

router.use(validateUser);

router.post(
  "/schedules",
  createVendorSchedules
);

router.post(
  "/schedules/sync",
  syncVendorProductSchedules
);

router.post(
  "/schedules/slots",
  createVendorScheduleSlotsForDates
);

router.get(
  "/schedules",
  getVendorSchedules
);

router.get(
  "/schedules/:scheduleId",
  getVendorSchedule
);

router.patch(
  "/schedules/slots/bulk",
  bulkUpdateVendorScheduleSlots
);

router.patch(
  "/schedules/:scheduleId",
  updateVendorSchedule
);

router.patch(
  "/schedules/:scheduleId/slots/:slotId",
  updateVendorScheduleSlot
);

router.get(
  "/schedules/:scheduleId/slots/:slotId/distance-tiers",
  getScheduleSlotDistanceTiers
);

router.put(
  "/schedules/:scheduleId/slots/:slotId/distance-tiers",
  replaceScheduleSlotDistanceTiers
);

router.delete(
  "/schedules/:scheduleId",
  deleteVendorSchedule
);

router.get(
  "/calendar",
  getVendorProductCalendar
);

module.exports = router;
