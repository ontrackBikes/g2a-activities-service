const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {Object} order - { orderId, totalPrice, currency, notes }
 * totalPrice in INR rupees, converted to paise for Razorpay
 */
async function createRazorpayOrder(order) {
  try {
    const options = {
      amount: order.totalPrice * 100, // Razorpay expects paise
      currency: order.currency || "INR",
      receipt: order.orderId,
      payment_capture: 1, // auto capture
      notes: order.notes || {},
    };

    const rzpOrder = await razorpay.orders.create(options);
    return { success: true, data: rzpOrder };
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return { success: false, error };
  }
}

/**
 * Create a Razorpay Payment Link
 * @param {Object} linkData - { amount, currency, customer, description, notes }
 * amount in INR rupees
 */
async function createPaymentLink(linkData) {
  try {
    const payload = {
      amount: linkData.amount * 100, // paise
      currency: linkData.currency || "INR",
      accept_partial: false,
      description: linkData.description || "Payment",
      customer: {
        name: linkData.customer?.name || "",
        email: linkData.customer?.email || "",
        contact: linkData.customer?.mobile || "",
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: linkData.notes || {},
    };

    const paymentLink = await razorpay.paymentLink.create(payload);
    return { success: true, data: paymentLink };
  } catch (error) {
    console.error("Razorpay payment link creation failed:", error);
    return { success: false, error };
  }
}

async function fetchPaymentByOrderId(orderId) {
  try {
    const response = await razorpay.orders.fetchPayments(orderId);
    const payments = response.items || [];

    if (!payments.length) {
      return {
        success: true,
        status: "pending",
        data: null,
      };
    }

    // Take latest payment
    const payment = payments[payments.length - 1];

    let status = "pending";
    if (payment.status === "captured") status = "success";
    if (payment.status === "failed") status = "failed";

    return {
      success: true,
      status,
      data: {
        order_id: orderId,
        payment_id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        method: payment.method,
        notes: payment.notes,
        reason: payment.error_description || null,
        created_at: new Date(payment.created_at * 1000).toISOString(),
      },
    };
  } catch (error) {
    console.error("Fetch payment by order id failed:", error);
    return {
      success: false,
      status: "failed",
      error,
    };
  }
}

module.exports = {
  createRazorpayOrder,
  createPaymentLink,
  fetchPaymentByOrderId,
};
