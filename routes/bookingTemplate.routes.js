const express = require("express");

const router = express.Router();

const {
  createBookingTemplate,
  getBookingTemplates,
  getBookingTemplate,
  updateBookingTemplate,
  deleteBookingTemplate,
  getBookingRegistry,
} = require("../controllers/bookingTemplate.controller");

/**
 * Registry
 */
router.get(
  "/registry",
  getBookingRegistry,
);

/**
 * CRUD
 */
router.post(
  "/",
  createBookingTemplate,
);

router.get(
  "/",
  getBookingTemplates,
);

router.get(
  "/:id",
  getBookingTemplate,
);

router.patch(
  "/:id",
  updateBookingTemplate,
);

router.delete(
  "/:id",
  deleteBookingTemplate,
);

module.exports = router;