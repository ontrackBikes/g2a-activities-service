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

module.exports = {
  createRazorpayOrder,
};
