const express = require("express");

const {
  createVendorSchedules,
  getVendorSchedules,
  getVendorSchedule,
  updateVendorSchedule,
  updateVendorScheduleSlot,
  bulkUpdateVendorScheduleSlots,
  deleteVendorSchedule,
  getVendorProductCalendar,
} = require("../controllers/vendorSchedule.controller");

const router = express.Router({
  mergeParams: true,
});

router.post(
  "/schedules",
  createVendorSchedules
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

router.delete(
  "/schedules/:scheduleId",
  deleteVendorSchedule
);

router.get(
  "/calendar",
  getVendorProductCalendar
);

module.exports = router;
