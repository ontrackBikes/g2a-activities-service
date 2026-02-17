const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");

// Razorpay webhook endpoint
router.post("/razorpay/webhook", webhookController.razorpayWebhook);
router.get("/razorpay/order-info", webhookController.getOrderInfo);

module.exports = router;

