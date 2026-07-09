const crypto = require("crypto");
const googleSheetService = require("../services/googleSheet.service");
const {
  fetchPaymentByOrderId,
  verifyWebhookSignature,
} = require("../services/razorpay.service");
const sequelize = require("../config/sequelize");
const { Payment, Order } = require("../models");
const { Op } = require("sequelize");
const {
  paymentSettlementQueue,
} = require("../queues/payment/paymentSettlement.queue");

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
      const productType = notes.productType;

      console.log("💰 Internal orderId from notes:", orderId);
      console.log("💰 Razorpay orderId:", razorpayOrderId);

      if (!orderId) {
        console.error(
          "❌ orderId missing from payment notes — cannot log to sheet",
        );
      }

      console.log("📝 Attempting to log payment to Google Sheet...");

      // ← ONLY log if we recognise the product type
      if (productType === "bike-rentals") {
        const sheetResult = await googleSheetService.logPayment({
          productType,
          orderId,
          razorpayOrderId,
          paymentId: payment.id,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          notes,
          paidAt: new Date(payment.created_at * 1000).toISOString(),
        });
        console.log(
          "📝 Sheet log result:",
          JSON.stringify(sheetResult, null, 2),
        );
      } else {
        console.log(
          `ℹ️ payment.captured for unhandled productType: ${productType} — skipping sheet log`,
        );
      }
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

const razorpayWebhookv1 = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    const rawBody = req.body.toString();

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.sendStatus(400);
    }

    const payload = JSON.parse(rawBody);

    if (payload.event !== "payment.captured") {
      return res.sendStatus(200);
    }

    const paymentEntity = payload.payload.payment.entity;

    const [updatedRows] = await Payment.update(
      {
        status: "captured",

        settlement_status: "pending",

        gateway_payment_id: paymentEntity.id,

        amount: paymentEntity.amount / 100,

        currency: paymentEntity.currency,

        gateway_response: paymentEntity,

        paid_at: new Date(paymentEntity.created_at * 1000),
      },
      {
        where: {
          gateway_order_id: paymentEntity.order_id,

          settlement_status: {
            [Op.ne]: "completed",
          },
        },
      },
    );

    if (!updatedRows) {
      return res.sendStatus(200);
    }

    const payment = await Payment.findOne({
      where: {
        gateway_order_id: paymentEntity.order_id,
      },
    });

    await paymentSettlementQueue.add("settle-payment", {
      paymentId: payment.id,
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("[RazorpayWebhook]", error);

    return res.sendStatus(500);
  }
};

module.exports = {
  razorpayWebhook,
  getOrderInfo,
  razorpayWebhookv1,
};
