const sequelize = require("../config/sequelize");
const emailTemplates = require("../constants/emailTemplates");

const {
  Payment,
  Order,
  OrderItem,
} = require("../models");


const { sendTemplateEmail, sendEmail } = require("./postmark.service");



/**
 * Lock payment
 */
async function lockPayment({
  paymentId,
  transaction,
}) {
  const payment = await Payment.findByPk(
    paymentId,
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!payment) {
    throw new Error("Payment not found.");
  }

  /**
   * Already settled
   */
  if (
    payment.settlement_status ===
    "completed"
  ) {
    return null;
  }

  /**
   * Acquire settlement lock
   */
  payment.settlement_status =
    "processing";

  await payment.save({
    transaction,
  });

  return payment;
}

/**
 * Lock order
 */
async function lockOrder({
  orderId,
  transaction,
}) {
  const order = await Order.findByPk(
    orderId,
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!order) {
    throw new Error("Order not found.");
  }

  return order;
}

/**
 * Confirm payment
 */
async function confirmPayment({
  payment,
  transaction,
}) {
  payment.status = "captured";

  if (!payment.paid_at) {
    payment.paid_at = new Date();
  }

  await payment.save({
    transaction,
  });

  return payment;
}

/**
 * Reserve inventory
 *
 * Actual implementation handled separately.
 */
async function reserveInventory({
  order,
  transaction,
}) {
  // await reserveInventoryForConfirmedOrder({
  //   order,
  //   transaction,
  // });

  return;
}

/**
 * Confirm order
 */
async function confirmOrder({
  order,
  transaction,
}) {
  order.payment_status = "paid";
  order.order_status = "confirmed";

  await order.save({
    transaction,
  });

  return order;
}

/**
 * Confirm order items
 */
async function confirmOrderItems({
  orderId,
  transaction,
}) {
  await OrderItem.update(
    {
      status: "confirmed",
    },
    {
      where: {
        order_id: orderId,
      },
      transaction,
    }
  );
}

/**
 * Send booking confirmation email
 *
 * Actual implementation handled separately.
 */

async function sendConfirmationEmail({
  payment,
  order,
}) {
  const customerEmail =
    order.customer_details?.email;

  if (!customerEmail) {
    console.warn(
      `[PaymentSettlement] No customer email found for order ${order.order_id}`
    );

    return {
      success: false,
      message: "Customer email not found",
    };
  }

  const templateModel = {
    orderId: order.order_id,
    customerName: order.customer_details?.name,
    amount: order.grand_total,
    currency: order.currency,
    paymentId: payment.payment_id,
    paymentStatus: payment.status,
  };

  /**
   * Use Postmark template if configured.
   */
  if (emailTemplates.BOOKING_CONFIRMATION) {
    console.log(
      `Sending booking confirmation template to ${customerEmail}`
    );

    return sendTemplateEmail({
      orderId: order.id,
      customerId: order.customer_id,

      to: customerEmail,

      templateAlias:
        emailTemplates.BOOKING_CONFIRMATION,

      templateModel,

      metadata: {
        type: "booking_confirmation",
      },
    });
  }

  /**
   * Fallback HTML email.
   */
  console.warn(
    "[PaymentSettlement] BOOKING_CONFIRMATION template not configured. Sending basic HTML email."
  );

  const subject = `Booking Confirmation - ${order.order_id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Booking Confirmed 🎉</h2>

      <p>Hi ${templateModel.customerName || "Customer"},</p>

      <p>Your booking has been confirmed successfully.</p>

      <table cellpadding="6">
        <tr>
          <td><strong>Order ID</strong></td>
          <td>${templateModel.orderId}</td>
        </tr>
        <tr>
          <td><strong>Payment ID</strong></td>
          <td>${templateModel.paymentId}</td>
        </tr>
        <tr>
          <td><strong>Amount</strong></td>
          <td>${templateModel.currency} ${templateModel.amount}</td>
        </tr>
        <tr>
          <td><strong>Status</strong></td>
          <td>${templateModel.paymentStatus}</td>
        </tr>
      </table>

      <p>Thank you for booking with us.</p>
    </div>
  `;

  return sendEmail({
    orderId: order.id,
    customerId: order.customer_id,

    to: customerEmail,

    subject,

    html,

    text: `Your booking ${templateModel.orderId} has been confirmed.`,

    metadata: {
      type: "booking_confirmation",
      fallback: true,
    },
  });
}

/**
 * Send notifications
 *
 * WhatsApp / SMS / Analytics etc.
 */
async function sendNotifications({
  payment,
  order,
}) {
  return;
}


const settlePayment = async ({ paymentId }) => {

  console.log("**** Payment Settlement Worker Triggered ****")
  const transaction = await sequelize.transaction();

  let payment = null;
  let order = null;

  try {
    /**
     * Acquire payment lock
     */
    payment = await lockPayment({
      paymentId,
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return;
    }

    /**
     * Acquire order lock
     */
    order = await lockOrder({
      orderId: payment.order_id,
      transaction,
    });

    /**
     * Confirm payment
     */
    await confirmPayment({
      payment,
      transaction,
    });

    /**
     * Reserve inventory
     */
    await reserveInventory({
      order,
      transaction,
    });

    /**
     * Confirm order
     */
    await confirmOrder({
      order,
      transaction,
    });

    /**
     * Confirm order items
     */
    await confirmOrderItems({
      orderId: order.id,
      transaction,
    });

    /**
     * Mark settlement completed
     */
    payment.settlement_status = "completed";

    await payment.save({
      transaction,
    });

    /**
     * Commit transaction
     */
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    console.error(
      "[PaymentSettlement]",
      error
    );

    /**
     * Mark settlement failed
     */
    if (payment) {
      await Payment.update(
        {
          settlement_status: "failed",
        },
        {
          where: {
            id: payment.id,
          },
        }
      );
    }

    throw error;
  }

  /**
   * Notifications
   *
   * These should never rollback a successful booking.
   */
  try {
    await sendConfirmationEmail({
      payment,
      order,
    });

    await sendNotifications({
      payment,
      order,
    });
  } catch (error) {
    console.error(
      "[PaymentSettlement][Notification]",
      error
    );
  }
};




module.exports = {
    settlePayment
}