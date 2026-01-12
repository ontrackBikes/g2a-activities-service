const express = require("express");
const router = express.Router();
const { createBikeRentalOrder } = require("../controllers/order.controller");

// POST /api/bike-rentals/order
router.post("/bike-rentals/order", createBikeRentalOrder);

module.exports = router;
