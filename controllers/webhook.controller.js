const crypto = require("crypto");
const googleSheetService = require("../services/googleSheetService");

const razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // // Razorpay sends signature in header
    // const signature = req.headers["x-razorpay-signature"];
    // const body = JSON.stringify(req.body);

    // // Verify webhook
    // const expectedSignature = crypto
    //   .createHmac("sha256", webhookSecret)
    //   .update(body)
    //   .digest("hex");

    // if (signature !== expectedSignature) {
    //   return res.status(400).send("Invalid signature");
    // }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;

      const notes = payment.notes || {};
      // Extract order_id and notes
      const razorpayOrderId = payment.order_id; // Razorpay order ID
      const orderId = notes.orderId; // Our internal order ID
      // Add payment info in Google Sheet
      const sheetResult = await googleSheetService.logPayment({
        orderId,
        razorpayOrderId: razorpayOrderId,
        paymentId: payment.id,
        amount: payment.amount / 100, // convert paise → INR
        currency: payment.currency,
        status: payment.status,
        notes,
        paidAt: new Date(payment.created_at * 1000).toISOString(),
      });

      console.log("Payment logged in sheet:", sheetResult);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  razorpayWebhook,
};
