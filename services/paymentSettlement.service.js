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

  /**
   * Build booking summary from Order Items
   */
  const itemsHtml = (order.items || [])
    .map((item) => {
      const booking =
        item.quotation?.booking ||
        item.booking_data ||
        {};

      const pricing =
        item.quotation?.pricing ||
        item.pricing ||
        {};

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px;">
          <h3 style="margin:0 0 10px;">
            ${item.product_name}
          </h3>

          <div>
            <strong>Location:</strong>
            ${item.location_name}
          </div>

          ${
            booking.travel_date
              ? `<div><strong>Travel Date:</strong> ${booking.travel_date}</div>`
              : ""
          }

          ${
            booking.pickup_date
              ? `<div><strong>Pickup Date:</strong> ${booking.pickup_date}</div>`
              : ""
          }

          ${
            booking.return_date
              ? `<div><strong>Return Date:</strong> ${booking.return_date}</div>`
              : ""
          }

          ${
            booking.rental_days
              ? `<div><strong>Rental Days:</strong> ${booking.rental_days}</div>`
              : ""
          }

          ${
            booking.guests
              ? `<div><strong>Guests:</strong> ${booking.guests}</div>`
              : ""
          }

          <hr style="margin:15px 0;">

          <div>
            <strong>Price:</strong>
            ${pricing.currency || order.currency}
            ${pricing.grand_total || pricing.subtotal || ""}
          </div>
        </div>
      `;
    })
    .join("");

  const templateModel = {
    orderId: order.order_id,
    customerName:
      order.customer_details?.name ||
      order.customer_details?.first_name ||
      "Customer",

    amount: order.grand_total,
    currency: order.currency,

    paymentId: payment.payment_id,
    paymentStatus: payment.status,

    items: order.items || [],
  };

  /**
   * Preferred: Postmark Template
   */
  if (emailTemplates.BOOKING_CONFIRMATION) {
    console.log(
      `[PaymentSettlement] Sending booking confirmation to ${customerEmail}`
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
   * HTML fallback
   */
  const subject = `Booking Confirmation - ${order.order_id}`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;line-height:1.6;">

      <h2>Booking Confirmed</h2>

      <p>
        Hi ${
          templateModel.customerName
        },
      </p>

      <p>
        Thank you for booking with us.
        Your booking has been confirmed.
      </p>

      <table cellpadding="6" cellspacing="0">
        <tr>
          <td><strong>Order ID</strong></td>
          <td>${order.order_id}</td>
        </tr>

        <tr>
          <td><strong>Payment ID</strong></td>
          <td>${payment.payment_id}</td>
        </tr>

        <tr>
          <td><strong>Status</strong></td>
          <td>${payment.status}</td>
        </tr>

        <tr>
          <td><strong>Total</strong></td>
          <td>${order.currency} ${order.grand_total}</td>
        </tr>
      </table>

      <br>

      ${itemsHtml}

      <p>
        We look forward to hosting you.
      </p>

      <p>
        Team Go2Andaman
      </p>

  </div>
  `;

  return sendEmail({
    orderId: order.id,
    customerId: order.customer_id,

    to: customerEmail,

    subject,

    html,

    text: `Your booking ${order.order_id} has been confirmed.`,

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



const settlePayment = async ({ paymentId } = {}) => {
  if (!paymentId) {
    throw new Error("paymentId is required.");
  }

  console.log(
    `[PaymentSettlement] Processing payment ${paymentId}`
  );

  const transaction =
    await sequelize.transaction();

  let payment = null;
  let order = null;

  try {
    /**
     * Acquire payment lock.
     *
     * Returns:
     * - null -> already settled / payment not found
     * - Payment -> continue settlement
     */
    payment = await lockPayment({
      paymentId,
      transaction,
    });

    if (!payment) {
      if (!transaction.finished) {
        await transaction.rollback();
      }

      console.log(
        `[PaymentSettlement] Payment ${paymentId} already settled or not found.`
      );

      return {
        success: true,
        skipped: true,
      };
    }

    /**
     * Lock order
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
     * Settlement completed
     */
    payment.settlement_status =
      "completed";

    await payment.save({
      transaction,
    });

    /**
     * Commit transaction
     */
    await transaction.commit();

    /**
     * Reload order with items.
     * This happens outside the transaction because
     * we only need it for notifications.
     */
    order = await Order.findByPk(
      order.id,
      {
        include: [
          {
            association: "items",
          },
        ],
      }
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      "[PaymentSettlement]",
      error
    );

    /**
     * Mark settlement failed.
     */
    if (payment?.id) {
      try {
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
      } catch (updateError) {
        console.error(
          "[PaymentSettlement][FailedUpdate]",
          updateError
        );
      }
    }

    throw error;
  }

  /**
   * Notifications
   *
   * These should never rollback
   * a successful settlement.
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

  console.log(
    `[PaymentSettlement] Payment ${payment.payment_id} settled successfully.`
  );

  return {
    success: true,
    paymentId: payment.payment_id,
    orderId: order.order_id,
  };
};



module.exports = {
    settlePayment
}