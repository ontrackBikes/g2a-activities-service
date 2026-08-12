module.exports = {
  BOOKING_CONFIRMATION:
    "activities_order_successful",

    // sample
    //     {
    //   "customerName": "customerName_Value",
    //   "orderId": "orderId_Value",
    //   "paymentId": "paymentId_Value",
    //   "paymentStatus": "paymentStatus_Value",
    //   "bookingDate": "bookingDate_Value",
    //   "currency": "currency_Value",
    //   "amount": "amount_Value",
    //   "items": [
    //     {
    //       "product_name": "product_name_Value",
    //       "location_name": "location_name_Value",
    //       "booking": {
    //         "travel_date": "travel_date_Value",
    //         "pickup_date": "pickup_date_Value",
    //         "return_date": "return_date_Value",
    //         "rental_days": "rental_days_Value",
    //         "guests": "guests_Value",
    //         "pickup_time": "pickup_time_Value",
    //         "return_time": "return_time_Value",
    //         "pickup_location": "pickup_location_Value",
    //         "drop_location": "drop_location_Value"
    //       },
    //       "pricing": {
    //         "currency": "currency_Value",
    //         "grand_total": "grand_total_Value"
    //       }
    //     }
    //   ],
    //   "customerEmail": "customerEmail_Value",
    //   "customerPhone": "customerPhone_Value",
    //   "subtotal": "subtotal_Value",
    //   "discount": "discount_Value",
    //   "tax": "tax_Value",
    //   "order_id": "order_id_Value"
    // }

  BOOKING_CANCELLED:
    "booking-cancelled",

  PAYMENT_PENDING:
    "activities_order_pending",

    // Sent when checkout polling finishes without a confirmed
    // payment status (e.g. customer closed the checkout modal).
    // Same model shape as PAYMENT_FAILED, with paymentStatus: "Pending".

  PAYMENT_FAILED:
    "activities_order_failed",

    //  sample
    //   {
    // 	"customerName": "customerName_Value",
    // 	"orderId": "orderId_Value",
    // 	"paymentId": "paymentId_Value",
    // 	"paymentStatus": "paymentStatus_Value",
    // 	"bookingDate": "bookingDate_Value",
    // 	"currency": "currency_Value",
    // 	"amount": "amount_Value",
    // 	"failureReason": "failureReason_Value",
    // 	"errorCode": "errorCode_Value",
    // 	"customerEmail": "customerEmail_Value",
    // 	"customerPhone": "customerPhone_Value",
    // 	"subtotal": "subtotal_Value",
    // 	"discount": "discount_Value",
    // 	"tax": "tax_Value",
    // 	"retryPaymentUrl": "retryPaymentUrl_Value",
    // 	"order_id": "order_id_Value"
    // }

  REFUND_PROCESSED:
    "refund-processed",
};