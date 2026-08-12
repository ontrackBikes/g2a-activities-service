const express = require("express");
const router = express.Router();
const {
  createBikeRentalOrder,
  createOrder,
  getOrders,
  getOrder,
  createOrderPayment,
  verifyOrderPayment,
  notifyPaymentPending,
} = require("../controllers/order.controller");

// POST /api/bike-rentals/order
router.get("/", getOrders);
router.post("/bike-rentals/order", createBikeRentalOrder);
router.post("/:estimate_id", createOrder);
router.get("/:order_id", getOrder);
router.post("/:order_id/create-payment", createOrderPayment);
router.get("/:order_id/verify-payment", verifyOrderPayment);
router.post("/:order_id/notify-payment-pending", notifyPaymentPending);
module.exports = router;
