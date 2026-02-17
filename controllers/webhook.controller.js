const crypto = require("crypto");
const googleSheetService = require("../services/googleSheetService");
const { fetchPaymentByOrderId } = require("../services/razorpayService");

const razorpayWebhook = async (req, res) => {
  console.log("🔔 Webhook received");
  console.log("🔔 Headers:", JSON.stringify(req.headers, null, 2));
  console.log("🔔 Body:", JSON.stringify(req.body, null, 2));

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ RAZORPAY_WEBHOOK_SECRET is not set in .env");
      return res.status(500).send("Webhook secret not configured");
    }

    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      console.error("❌ No x-razorpay-signature header found");
      return res.status(400).send("Missing signature");
    }

    const body = JSON.stringify(req.body);
    console.log("🔔 Raw body string used for HMAC:", body.substring(0, 200));

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    console.log("🔔 Received signature: ", signature);
    console.log("🔔 Expected signature: ", expectedSignature);
    console.log("🔔 Signature match:", signature === expectedSignature);

    if (signature !== expectedSignature) {
      console.error("❌ Webhook signature mismatch — rejecting");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    console.log("✅ Signature verified. Event:", event);

    const payload = req.body.payload;

    if (event === "payment.captured") {
      console.log("💰 payment.captured event received");
      const payment = payload.payment.entity;
      console.log("💰 Payment entity:", JSON.stringify(payment, null, 2));

      const notes = payment.notes || {};
      const razorpayOrderId = payment.order_id;
      const orderId = notes.orderId;

      console.log("💰 Internal orderId from notes:", orderId);
      console.log("💰 Razorpay orderId:", razorpayOrderId);

      if (!orderId) {
        console.error(
          "❌ orderId missing from payment notes — cannot log to sheet",
        );
      }

      console.log("📝 Attempting to log payment to Google Sheet...");
      const sheetResult = await googleSheetService.logPayment({
        orderId,
        razorpayOrderId,
        paymentId: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        notes,
        paidAt: new Date(payment.created_at * 1000).toISOString(),
      });

      console.log("📝 Sheet log result:", JSON.stringify(sheetResult, null, 2));
    } else {
      console.log("ℹ️ Event not handled:", event);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    console.error("❌ Stack:", error.stack);
    res.status(500).send("Server error");
  }
};

const getOrderInfo = async (req, res) => {
  try {
    const { order_id } = req.query;

    if (!order_id) {
      return res.status(400).json({
        status: "failed",
        reason: "order_id is required",
      });
    }

    const result = await fetchPaymentByOrderId(order_id);

    if (!result.success) {
      return res.status(500).json({
        status: "failed",
        reason: "Unable to fetch payment",
      });
    }

    if (result.status === "pending") {
      return res.json({
        status: "pending",
        order_id,
      });
    }

    return res.json({
      status: result.status,
      ...result.data,
    });
  } catch (error) {
    console.error("Order info API error:", error);
    res.status(500).json({
      status: "failed",
      reason: "Server error",
    });
  }
};

module.exports = {
  razorpayWebhook,
  getOrderInfo,
};

