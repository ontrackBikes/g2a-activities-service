const {
  resendPaymentEmail,
} = require("../services/paymentSettlement.service");
const { resendEmailSchema } = require("../schemas/payment.schema");

const REASON_STATUS = {
  not_found: 404,
  order_not_found: 404,
  unsupported_status: 400,
  no_customer_email: 400,
};

const REASON_MESSAGE = {
  not_found: "Payment not found.",
  order_not_found: "Order not found for this payment.",
  no_customer_email: "Customer email not found on this order.",
};

const resendEmail = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const { error, value } = resendEmailSchema.validate(req.body || {});

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const result = await resendPaymentEmail({
      paymentId: payment_id,
      to: value.to,
      cc: value.cc,
      bcc: value.bcc,
    });

    if (!result.success) {
      const status = REASON_STATUS[result.reason] || 502;

      const message =
        result.reason === "unsupported_status"
          ? `Cannot send email for payment status '${result.status}'.`
          : REASON_MESSAGE[result.reason] || "Failed to send email.";

      return res.status(status).json({
        success: false,
        message,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        result.type === "payment_failed"
          ? "Payment failed email sent."
          : "Booking confirmation email sent.",
      data: result.data,
    });
  } catch (error) {
    console.error("[resendPaymentEmail]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend payment email.",
    });
  }
};

module.exports = {
  resendEmail,
};
