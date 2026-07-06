const express = require("express");
const router = express.Router();
const { createBikeRentalOrder, createOrder } = require("../controllers/order.controller");

// POST /api/bike-rentals/order
router.post("/bike-rentals/order", createBikeRentalOrder);
router.post("/", createOrder);
module.exports = router;
