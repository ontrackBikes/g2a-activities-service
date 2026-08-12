const sequelize = require("../config/sequelize");
const emailTemplates = require("../constants/emailTemplates");

const { Payment, Order, OrderItem, VendorScheduleSlot } = require("../models");
const BookingEstimate = require("../models/bookingEstimate.model");

const { sendTemplateEmail, sendEmail } = require("./postmark.service");

/**
 * Lock payment
 */
/**
 * Acquire settlement lock.
 *
 * Returns:
 * {
 *   status: "ready" | "already_settled" | "not_found",
 *   payment: Payment | null,
 * }
 */
async function lockPayment({ paymentId, transaction }) {
  const payment = await Payment.findByPk(paymentId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  /**
   * Payment not found.
   */
  if (!payment) {
    return {
      status: "not_found",
      payment: null,
    };
  }

  /**
   * Already settled.
   */
  if (payment.settlement_status === "completed") {
    return {
      status: "already_settled",
      payment,
    };
  }

  /**
   * Acquire settlement lock.
   */
  payment.settlement_status = "processing";

  await payment.save({
    transaction,
  });

  return {
    status: "ready",
    payment,
  };
}

/**
 * Lock order
 */
async function lockOrder({ orderId, transaction }) {
  const order = await Order.findByPk(orderId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  return order;
}

/**
 * Confirm payment
 */
async function confirmPayment({ payment, transaction }) {
  payment.status = "captured";

  if (!payment.paid_at) {
    payment.paid_at = new Date();
  }

  await payment.save({
    transaction,
  });

  return payment;
}

const getInventorySlotIds = (estimate) => {
  const metadata = estimate.metadata || {};
  const dateRangeSlotIds = Array.isArray(metadata.inventory_slots)
    ? metadata.inventory_slots
        .map((entry) => Number(entry.vendor_schedule_slot_id))
        .filter((slotId) => Number.isInteger(slotId) && slotId > 0)
    : [];

  if (dateRangeSlotIds.length) {
    return [...new Set(dateRangeSlotIds)];
  }

  const selectedSlotId = Number(
    metadata.slot_mapping?.[estimate.selected_slot_token] ||
      estimate.vendor_schedule_slot_id,
  );

  return Number.isInteger(selectedSlotId) && selectedSlotId > 0
    ? [selectedSlotId]
    : [];
};

async function reserveInventory({ order, transaction }) {
  const estimate = await BookingEstimate.findOne({
    where: {
      estimate_id: order.estimate_id,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!estimate) {
    throw new Error(`BookingEstimate ${order.estimate_id} not found.`);
  }

  const inventorySlotIds = getInventorySlotIds(estimate);

  if (!inventorySlotIds.length) {
    return;
  }

  const slots = await VendorScheduleSlot.findAll({
    where: {
      id: inventorySlotIds,
    },
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (slots.length !== inventorySlotIds.length) {
    throw new Error(
      `Inventory slot not found for estimate ${estimate.estimate_id}.`,
    );
  }

  const quantity = Number(estimate.pricing?.quantity || 1);

  for (const slot of slots) {
    if (Number(slot.available) < quantity) {
      throw new Error(
        `Insufficient inventory for slot ${slot.id}. Requested ${quantity}, Available ${slot.available}.`,
      );
    }
  }

  await Promise.all(
    slots.map((slot) =>
      slot.update(
        {
          booked: Number(slot.booked) + quantity,
          available: Number(slot.available) - quantity,
        },
        { transaction },
      ),
    ),
  );

  console.log(
    `[Inventory] Reserved ${quantity} seat(s) across ${slots.length} schedule slot(s).`,
  );
}

/**
 * Confirm order
 */
async function confirmOrder({ order, transaction }) {
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
async function confirmOrderItems({ orderId, transaction }) {
  await OrderItem.update(
    {
      status: "confirmed",
    },
    {
      where: {
        order_id: orderId,
      },
      transaction,
    },
  );
}

const formatEmailAmount = (value) => {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : "";
};

const formatEmailLocation = (location) => {
  if (!location) {
    return null;
  }

  if (typeof location === "string") {
    return {
      name: location,
      address: "",
      type: "",
    };
  }

  return {
    name: location.name || "",
    address: location.address || "",
    type: location.type || "",
  };
};

const formatEmailLocationLabel = (location) =>
  [location?.name, location?.address].filter(Boolean).join(", ");

const compactObject = (input) => {
  if (Array.isArray(input)) {
    return input.map(compactObject);
  }

  if (input === null || typeof input !== "object") {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, compactObject(value)])
      .filter(([, value]) => value !== null && value !== undefined && value !== ""),
  );
};

const formatEmailParticipant = (participant) => ({
  first_name: participant.first_name || "",
  last_name: participant.last_name || "",
  age: participant.age ?? "",
  gender: participant.gender || "",
  nationality: participant.nationality || "",
});

const buildEmailItem = ({ item, order }) => {
  const booking = item.booking_data || item.quotation?.booking || {};
  const pricing = item.pricing || item.quotation?.pricing || {};
  const rentalDetails = item.booking_payload?.rental_details || null;
  const pickupLocation = formatEmailLocation(
    booking.pickup_location || rentalDetails?.pickup_point,
  );
  const dropLocation = formatEmailLocation(
    booking.drop_location || rentalDetails?.drop_point,
  );
  const selectedSlot = booking.selected_slot || null;

  return {
    product_name: item.product_name,
    location_name: item.location_name,
    booking: compactObject({
      booking_mode: booking.booking_mode || item.booking_mode || "",
      travel_date: booking.travel_date || "",
      pickup_date: booking.pickup_date || "",
      return_date: booking.return_date || "",
      rental_days: booking.rental_days ?? "",
      guests: booking.guests ?? "",
      quantity: booking.quantity ?? "",
      pickup_time: booking.pickup_time || rentalDetails?.pickup_time || "",
      drop_time: booking.drop_time || "",
      return_time: booking.drop_time || "",
      transfer_type: booking.transfer_type || "",
      selected_slot: selectedSlot
        ? {
            name: selectedSlot.name || "",
            slot_type: selectedSlot.slot_type || "",
            start_time: selectedSlot.start_time || "",
            end_time: selectedSlot.end_time || "",
            price: formatEmailAmount(selectedSlot.price),
          }
        : null,
      pickup_location: formatEmailLocationLabel(pickupLocation),
      pickup_location_details: pickupLocation,
      drop_location: formatEmailLocationLabel(dropLocation),
      drop_location_details: dropLocation,
      rental_details: rentalDetails
        ? {
            pickup_type: rentalDetails.pickup_type || "",
            pickup_point: formatEmailLocation(rentalDetails.pickup_point),
            pickup_hotel_name: rentalDetails.pickup_hotel_name || "",
            drop_type: rentalDetails.drop_type || "",
            drop_point: formatEmailLocation(rentalDetails.drop_point),
            drop_hotel_name: rentalDetails.drop_hotel_name || "",
          }
        : null,
      opt_for_pickup_and_drop:
        item.booking_payload?.opt_for_pickup_and_drop ?? false,
    }),
    participants: (item.participants || []).map(formatEmailParticipant),
    pricing: {
      currency: pricing.currency || order.currency,
      unit_price: formatEmailAmount(pricing.unit_price),
      subtotal: formatEmailAmount(pricing.subtotal),
      discount: formatEmailAmount(pricing.discount),
      tax: formatEmailAmount(pricing.tax),
      grand_total: formatEmailAmount(pricing.grand_total ?? pricing.subtotal),
    },
  };
};

/**
 * Send booking confirmation email
 *
 * Actual implementation handled separately.
 */

async function sendConfirmationEmail({ payment, order }) {
  const customerEmail = order.customer_details?.email;

  if (!customerEmail) {
    console.warn(
      `[PaymentSettlement] No customer email found for order ${order.order_id}`,
    );

    return {
      success: false,
      message: "Customer email not found",
    };
  }

  const emailItems = (order.items || []).map((item) =>
    buildEmailItem({ item, order }),
  );

  const itemsHtml = emailItems
    .map((item) => {
      const { booking, pricing } = item;

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

          ${
            booking.quantity
              ? `<div><strong>Quantity:</strong> ${booking.quantity}</div>`
              : ""
          }

          <hr style="margin:15px 0;">

          <div>
            <strong>Price:</strong>
            ${pricing.currency} ${pricing.grand_total}
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

    paymentId: payment.gateway_payment_id,
    paymentStatus: payment.status,

    items: emailItems,
  };

  /**
   * Preferred: Postmark Template
   */
  if (emailTemplates.BOOKING_CONFIRMATION) {
    console.log(
      `[PaymentSettlement] Sending booking confirmation to ${customerEmail}`,
    );

    const customerName =
      order.customer_details?.name ||
      [order.customer_details?.first_name, order.customer_details?.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Customer";

    const emailTemplateModel = {
      customerName,
      customerEmail,
      customerPhone: order.customer_details?.phone || "",
      orderId: order.order_id,
      order_id: order.order_id,
      paymentId: payment.gateway_payment_id || payment.payment_id,
      paymentStatus:
        payment.status === "captured"
          ? "Successful"
          : payment.status === "authorized"
            ? "Pending"
            : payment.status,
      bookingDate: new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      currency: order.currency,
      amount: formatEmailAmount(order.grand_total),
      subtotal: formatEmailAmount(order.subtotal),
      discount: formatEmailAmount(order.discount),
      tax: formatEmailAmount(order.tax),
      customer: {
        first_name: order.customer_details?.first_name || "",
        last_name: order.customer_details?.last_name || "",
        email: customerEmail,
        country: order.customer_details?.country || "",
        country_code: order.customer_details?.country_code || "",
        phone: order.customer_details?.phone || "",
        alternate_country_code:
          order.customer_details?.alternate_country_code || "",
        alternate_phone: order.customer_details?.alternate_phone || "",
      },
      items: emailItems,
    };

    return sendTemplateEmail({
      orderId: order.id,
      customerId: order.customer_id,

      to: customerEmail,

      templateAlias: emailTemplates.BOOKING_CONFIRMATION,

      templateModel: emailTemplateModel,

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
        Hi ${templateModel.customerName},
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
 * Send payment failed email
 */
async function sendPaymentFailedEmail({ payment, order }) {
  const customerEmail = order.customer_details?.email;

  if (!customerEmail) {
    console.warn(
      `[PaymentSettlement] No customer email found for order ${order.order_id}`,
    );

    return {
      success: false,
      message: "Customer email not found",
    };
  }

  const customerName =
    order.customer_details?.name ||
    [order.customer_details?.first_name, order.customer_details?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Customer";

  const gatewayResponse = payment.gateway_response || {};

  const emailTemplateModel = {
    customerName,
    customerEmail,
    customerPhone: order.customer_details?.phone || "",
    orderId: order.order_id,
    order_id: order.order_id,
    paymentId: payment.gateway_payment_id || payment.payment_id,
    paymentStatus: "Failed",
    bookingDate: new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    currency: order.currency,
    amount: formatEmailAmount(order.grand_total),
    failureReason:
      payment.failure_reason || gatewayResponse.error_description || "",
    errorCode: gatewayResponse.error_code || "",
    subtotal: formatEmailAmount(order.subtotal),
    discount: formatEmailAmount(order.discount),
    tax: formatEmailAmount(order.tax),
    retryPaymentUrl: `${process.env.APP_URL}/checkout/orders/${order.order_id}`,
  };

  console.log(
    `[PaymentSettlement] Sending payment failed email to ${customerEmail}`,
  );

  return sendTemplateEmail({
    orderId: order.id,
    customerId: order.customer_id,

    to: customerEmail,
    bcc: process.env.EMAIL_BCC_TEAM || null,
    cc: process.env.EMAIL_CC_TEAM || null,

    templateAlias: emailTemplates.PAYMENT_FAILED,

    templateModel: emailTemplateModel,

    metadata: {
      type: "payment_failed",
    },
  });
}

/**
 * Send when checkout polling finishes without a confirmed payment
 * status (e.g. customer closed the checkout modal / gave up before
 * completing payment). Mirrors sendPaymentFailedEmail.
 */
async function sendPaymentPendingEmail({ payment, order }) {
  const customerEmail = order.customer_details?.email;

  if (!customerEmail) {
    console.warn(
      `[PaymentSettlement] No customer email found for order ${order.order_id}`,
    );

    return {
      success: false,
      message: "Customer email not found",
    };
  }

  const customerName =
    order.customer_details?.name ||
    [order.customer_details?.first_name, order.customer_details?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Customer";

  const gatewayResponse = payment.gateway_response || {};

  const emailTemplateModel = {
    customerName,
    customerEmail,
    customerPhone: order.customer_details?.phone || "",
    orderId: order.order_id,
    order_id: order.order_id,
    paymentId: payment.gateway_payment_id || payment.payment_id,
    paymentStatus: "Pending",
    bookingDate: new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    currency: order.currency,
    amount: formatEmailAmount(order.grand_total),
    failureReason:
      payment.failure_reason || gatewayResponse.error_description || "",
    errorCode: gatewayResponse.error_code || "",
    subtotal: formatEmailAmount(order.subtotal),
    discount: formatEmailAmount(order.discount),
    tax: formatEmailAmount(order.tax),
    retryPaymentUrl: `${process.env.APP_URL}/checkout/orders/${order.order_id}`,
  };

  console.log(
    `[PaymentSettlement] Sending payment pending email to ${customerEmail}`,
  );

  return sendTemplateEmail({
    orderId: order.id,
    customerId: order.customer_id,

    to: customerEmail,
    bcc: process.env.EMAIL_BCC_TEAM || null,
    cc: process.env.EMAIL_CC_TEAM || null,

    templateAlias: emailTemplates.PAYMENT_PENDING,

    templateModel: emailTemplateModel,

    metadata: {
      type: "payment_pending",
    },
  });
}

/**
 * Resend the email for a payment, by public payment_id.
 *
 * Dispatches to the confirmation or failure email based on
 * the payment's current status.
 */
async function resendPaymentEmail({ paymentId } = {}) {
  if (!paymentId) {
    throw new Error("paymentId is required.");
  }

  const payment = await Payment.findOne({
    where: {
      payment_id: paymentId,
    },
  });

  if (!payment) {
    return {
      success: false,
      reason: "not_found",
    };
  }

  const order = await Order.findByPk(payment.order_id, {
    include: [
      {
        association: "items",
        include: [
          {
            association: "participants",
          },
        ],
      },
    ],
  });

  if (!order) {
    return {
      success: false,
      reason: "order_not_found",
    };
  }

  let type;
  let result;

  if (payment.status === "captured") {
    type = "booking_confirmation";
    result = await sendConfirmationEmail({ payment, order });
  } else if (payment.status === "failed") {
    type = "payment_failed";
    result = await sendPaymentFailedEmail({ payment, order });
  } else {
    return {
      success: false,
      reason: "unsupported_status",
      status: payment.status,
    };
  }

  if (!result.success) {
    return {
      success: false,
      reason:
        result.message === "Customer email not found"
          ? "no_customer_email"
          : "send_failed",
      type,
    };
  }

  if (type === "booking_confirmation") {
    await order.update({ email_confirmation_sent_at: new Date() });
  }

  return {
    success: true,
    type,
    data: result.data,
  };
}

/**
 * Test booking confirmation email
 *
 * Usage:
 * await testSendConfirmationEmail({
 *   orderId: "ORD1784307434075",
 * });
 */

// const testSendConfirmationEmail = async ({ orderId }) => {
//   if (!orderId) {
//     throw new Error("orderId is required.");
//   }

//   console.log(
//     `[TestEmail] Preparing booking confirmation for order ${orderId}`
//   );

//   const order = await Order.findOne({
//     where: {
//       order_id: orderId, // use id if you want DB id instead
//     },
//     include: [
//       {
//         association: "items",
//         include: [
//           {
//             association: "participants",
//           },
//         ],
//       },
//     ],
//   });

//   if (!order) {
//     throw new Error(`Order '${orderId}' not found.`);
//   }

//   const payment = await Payment.findOne({
//     where: {
//       order_id: order.id,
//       status: "captured", // optional
//     },
//     order: [["created_at", "DESC"]],
//   });

//   if (!payment) {
//     throw new Error(
//       `No payment found for order '${orderId}'.`
//     );
//   }

//   console.log(
//     `[TestEmail] Sending booking confirmation to ${order.customer_details?.email}`
//   );

//   const result = await sendConfirmationEmail({
//     payment,
//     order,
//   });

//   console.log("[TestEmail] Done.", result);

//   return result;
// };

// (async () => {
//   try {
//     await testSendConfirmationEmail({
//       orderId: "1d39edb3-a311-491b-b846-d70fd9f5a550",
//     });

//     process.exit(0);
//   } catch (err) {
//     console.error(err);
//     process.exit(1);
//   }
// })();

/**
 * Send notifications
 *
 * WhatsApp / SMS / Analytics etc.
 */
async function sendNotifications({ payment, order }) {
  return;
}

const settlePayment = async ({ paymentId } = {}) => {
  if (!paymentId) {
    throw new Error("paymentId is required.");
  }

  console.log(`[PaymentSettlement] Processing payment ${paymentId}`);

  const transaction = await sequelize.transaction();

  let payment = null;
  let order = null;

  try {
    /**
     * Acquire settlement lock.
     */
    const result = await lockPayment({
      paymentId,
      transaction,
    });

    payment = result.payment;

    switch (result.status) {
      case "not_found":
        await transaction.rollback();

        console.warn(`[PaymentSettlement] Payment ${paymentId} not found.`);

        return {
          success: false,
          reason: "not_found",
        };

      case "already_settled":
        await transaction.rollback();

        console.log(
          `[PaymentSettlement] Payment ${paymentId} already settled.`,
        );

        return {
          success: true,
          skipped: true,
          reason: "already_settled",
        };

      case "ready":
        break;

      default:
        throw new Error(`Unknown payment status '${result.status}'.`);
    }

    /**
     * Lock order.
     */
    order = await lockOrder({
      orderId: payment.order_id,
      transaction,
    });

    /**
     * Confirm payment.
     */
    await confirmPayment({
      payment,
      transaction,
    });

    /**
     * Reserve inventory.
     */
    await reserveInventory({
      order,
      transaction,
    });

    /**
     * Confirm order.
     */
    await confirmOrder({
      order,
      transaction,
    });

    /**
     * Confirm order items.
     */
    await confirmOrderItems({
      orderId: order.id,
      transaction,
    });

    /**
     * Settlement completed.
     */
    payment.settlement_status = "completed";

    await payment.save({
      transaction,
    });

    /**
     * Commit transaction.
     */
    await transaction.commit();

    /**
     * Reload order for notifications.
     */
    order = await Order.findByPk(order.id, {
      include: [
        {
          association: "items",
          include: [
            {
              association: "participants",
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("[PaymentSettlement]", error);

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
          },
        );
      } catch (updateError) {
        console.error("[PaymentSettlement][FailedUpdate]", updateError);
      }
    }

    throw error;
  }

  /**
   * Notifications.
   *
   * These must never rollback
   * a successful payment.
   */
  try {
    const confirmationEmailResult = await sendConfirmationEmail({
      payment,
      order,
    });

    if (confirmationEmailResult?.success) {
      await order.update({ email_confirmation_sent_at: new Date() });
    }

    await sendNotifications({
      payment,
      order,
    });
  } catch (error) {
    console.error("[PaymentSettlement][Notification]", error);
  }

  console.log(
    `[PaymentSettlement] Payment ${payment.payment_id} settled successfully.`,
  );

  return {
    success: true,
    paymentId: payment.payment_id,
    orderId: order.order_id,
  };
};

module.exports = {
  settlePayment,
  sendPaymentFailedEmail,
  sendPaymentPendingEmail,
  resendPaymentEmail,
};
