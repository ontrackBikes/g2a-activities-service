const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");

// Razorpay webhook endpoint
router.post(
  "/razorpay/webhook",
  express.json(),
  webhookController.razorpayWebhook
);

module.exports = router;
