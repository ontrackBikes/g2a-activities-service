const express = require("express");
const router = express.Router();
const { createBikeRentalOrder, createOrder, getOrder, createOrderPayment, verifyOrderPayment } = require("../controllers/order.controller");

// POST /api/bike-rentals/order
router.post("/:estimate_id", createOrder);
router.post("/bike-rentals/order", createBikeRentalOrder);
router.get("/:order_id", getOrder);
router.post("/:order_id/create-payment", createOrderPayment);
router.get("/:order_id/verify-payment", verifyOrderPayment);
module.exports = router;
