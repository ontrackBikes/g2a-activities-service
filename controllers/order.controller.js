const { validate } = require("../schemas/bikeRentalsOrder.schema");
const googleSheetService = require("../services/googleSheet.service");
const bikeRentalService = require("../services/bikeRentals.service");
const razorpayService = require("../services/razorpay.service");
const BookingEstimate = require("../models/bookingEstimate.model");
const {
  Product,
  BookingTemplate,
  Order,
  OrderItem,
  OrderParticipant,
} = require("../models");


const { validateBookingPayload } = require("../schemas/bookingPayload.schema");
const sequelize = require("../config/sequelize");

const normalizePickupDropPayload = (payload) => {
  const clean = { ...payload };

  /* ---------- PICKUP ---------- */
  if (clean.pickupType === "hotel") {
    delete clean.pickup;
  } else {
    delete clean.pickupHotelName;
  }

  /* ---------- DROP ---------- */
  if (clean.dropType === "hotel") {
    delete clean.drop;
  } else {
    delete clean.dropHotelName;
  }

  return clean;
};

const createBikeRentalOrder = async (req, res) => {
  try {
    const {
      locationName,
      startDate,
      endDate,
      quantity,
      paymentType,

      pickupType,
      dropType,
      pickup,
      drop,

      pickupHotelName,
      dropHotelName,

      pickupTime,

      customer,
      usePaymentLink = false,
    } = req.body;

    const payload = normalizePickupDropPayload(req.body);

    /* -------------------- VALIDATION -------------------- */
    const errors = validate(payload);
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors,
      });
    }

    /* -------------------- AVAILABILITY -------------------- */
    const availability = bikeRentalService.bikeRentals.checkAvailability({
      locationName,
      startDate,
      endDate,
      quantity,
      pickupType,
      dropType,
      pickup,
      drop,
    });

    if (!availability.success) {
      return res.status(400).json(availability);
    }

    /* -------------------- SELECT PRICING -------------------- */
    const pricing = availability.data.pricing.find(
      (p) => p.paymentType === paymentType,
    );

    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: `Invalid Payment Mode Selected. Available options: ${availability.data.pricing
          .map((p) => p.label)
          .join(", ")}`,
      });
    }

    /*
      pricing already contains:
      - rentalAmount
      - pickupCharge
      - dropCharge
      - total
    */

    /* -------------------- GOOGLE SHEET ORDER -------------------- */
    const sheetResult = await googleSheetService.createOrder({
      productType: "bike-rentals",
      locationName,
      startDate,
      endDate,
      quantity,
      rentalDays: availability.data.rentalDays,

      pickupType,
      dropType,
      pickup,
      drop,
      pickupHotelName,
      dropHotelName,

      pickupTime,
      dropTime: pickupTime,

      pricing: {
        paymentType: pricing.paymentType,
        label: pricing.label,
        amountPerDay: pricing.amountPerDay,
        rentalAmount: pricing.rentalAmount,
        pickupCharge: pricing.pickupCharge,
        dropCharge: pricing.dropCharge,
        total: pricing.total,
      },

      customer,
    });

    if (!sheetResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create order in sheet",
      });
    }

    const orderId = sheetResult.orderId;
    let paymentResult;

    /* -------------------- PAYMENT -------------------- */
    const paymentPayload = {
      amount: pricing.total, // ✅ single source of truth
      currency: "INR",
      description: `Bike Rental Payment - ${orderId}`,
      notes: {
        orderId,
        productType: "bike-rentals",
        location: locationName,
        startDate,
        endDate,
        quantity,
        pickupType,
        dropType,
        pickup,
        drop,
        pickupHotelName,
        dropHotelName,
        paymentType: pricing.label,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    };

    if (usePaymentLink) {
      paymentResult = await razorpayService.createPaymentLink({
        ...paymentPayload,
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          mobile: customer.mobile,
        },
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay payment link",
        });
      }
    } else {
      paymentResult = await razorpayService.createRazorpayOrder({
        orderId,
        totalPrice: pricing.total,
        currency: "INR",
        notes: paymentPayload.notes,
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }
    }

    /* -------------------- SUCCESS -------------------- */
    return res.json({
      success: true,
      orderId,
      pricing,
      payment: paymentResult.data,
      paymentTypeUsed: usePaymentLink ? "link" : "order",
    });
  } catch (error) {
    console.error("Error creating bike rental order:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



const createOrder = async ({ estimateId, payload }) => {
  const transaction = await sequelize.transaction();

  try {
    /*
    |--------------------------------------------------------------------------
    | Estimate
    |--------------------------------------------------------------------------
    */

    const estimate = await BookingEstimate.findOne({
      where: {
        estimate_id: estimateId,
        status: "draft",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!estimate) {
      throw {
        status: 404,
        message: "Estimate not found.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Expiry
    |--------------------------------------------------------------------------
    */

    if (new Date() > estimate.expires_at) {
      throw {
        status: 410,
        message: "Estimate has expired.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Slot Required
    |--------------------------------------------------------------------------
    */

    if (
      estimate.booking_mode === "single_date" &&
      !estimate.vendor_schedule_slot_id
    ) {
      throw {
        status: 400,
        message: "Please select a slot.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Product
    |--------------------------------------------------------------------------
    */

    const product = await Product.findByPk(estimate.product_id, {
      include: [
        {
          model: BookingTemplate,
          as: "bookingTemplate",
        },
      ],
      transaction,
    });

    if (!product) {
      throw {
        status: 404,
        message: "Product not found.",
      };
    }

    if (!product.bookingTemplate) {
      throw {
        status: 500,
        message: "Booking template not configured.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Booking Payload
    |--------------------------------------------------------------------------
    */

    const validation = validateBookingPayload({
      bookingTemplate: product.bookingTemplate,
      payload,
    });

    if (!validation.valid) {
      throw {
        status: 422,
        message: "Validation failed.",
        errors: validation.errors,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Find / Create Customer
    |--------------------------------------------------------------------------
    */

    let customer = await Customer.findOne({
      where: {
        mobile: payload.customer_details.phone,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customer) {
      customer = await Customer.create(
        {
          first_name: payload.customer_details.first_name,

          last_name: payload.customer_details.last_name,

          email: payload.customer_details.email,

          mobile: payload.customer_details.phone,

          country: payload.customer_details.country,
        },
        {
          transaction,
        },
      );
    } else {
      await customer.update(
        {
          first_name:
            customer.first_name ||
            payload.customer_details.first_name,

          last_name:
            customer.last_name ||
            payload.customer_details.last_name,

          email:
            customer.email ||
            payload.customer_details.email,

          country:
            customer.country ||
            payload.customer_details.country,
        },
        {
          transaction,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Order
    |--------------------------------------------------------------------------
    */

    const order = await Order.create(
      {
        estimate_id: estimate.estimate_id,

        customer_id: customer.id,

        customer_details: JSON.parse(
          JSON.stringify(payload.customer_details),
        ),

        currency: estimate.pricing.currency,

        subtotal: estimate.pricing.subtotal,

        discount: estimate.pricing.discount,

        tax: estimate.pricing.tax,

        grand_total: estimate.pricing.grand_total,

        payment_status: "pending",

        order_status: "pending_payment",
      },
      {
        transaction,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Order Item
    |--------------------------------------------------------------------------
    */

    const orderItem = await OrderItem.create(
      {
        order_id: order.id,

        line_no: 1,

        product_id: estimate.product_id,

        product_name:
          estimate.quotation.product.name,

        product_slug:
          estimate.quotation.product.slug,

        thumbnail_url:
          estimate.quotation.product.thumbnail_url,

        location_id: estimate.location_id,

        location_name:
          estimate.quotation.location.name,

        location_slug:
          estimate.quotation.location.slug,

        vendor_product_id:
          estimate.vendor_product_id,

        vendor_id: estimate.vendor_id,

        vendor_schedule_id:
          estimate.vendor_schedule_id,

        vendor_schedule_slot_id:
          estimate.vendor_schedule_slot_id,

        booking_mode:
          estimate.booking_mode,

        booking_template_id:
          product.bookingTemplate.id,

        booking_template_version:
          product.bookingTemplate.version,

        booking_data: JSON.parse(
          JSON.stringify(estimate.booking_data),
        ),

        booking_payload: JSON.parse(
          JSON.stringify(payload),
        ),

        quotation: JSON.parse(
          JSON.stringify(estimate.quotation),
        ),

        pricing: JSON.parse(
          JSON.stringify(estimate.pricing),
        ),

        status: "pending",
      },
      {
        transaction,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Participants
    |--------------------------------------------------------------------------
    */

    if (Array.isArray(payload.participants)) {
      await OrderParticipant.bulkCreate(
        payload.participants.map((participant) => ({
          order_id: order.id,

          order_item_id: orderItem.id,

          first_name: participant.first_name,

          last_name: participant.last_name,

          age: participant.age,

          gender: participant.gender,

          nationality: participant.nationality,

          height: participant.height,

          weight: participant.weight,

          shoe_size: participant.shoe_size,

          passport_number:
            participant.passport_number,

          id_number: participant.id_number,

          seat_preference:
            participant.seat_preference,

          seat_number:
            participant.seat_number,

          medical_declaration:
            payload.medical_declaration || {},

          emergency_contact:
            payload.emergency_contact || {},
        })),
        {
          transaction,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Estimate
    |--------------------------------------------------------------------------
    */

    estimate.status = "converted";

    estimate.order_public_id = order.order_id;

    estimate.converted_at = new Date();

    await estimate.save({
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | Commit
    |--------------------------------------------------------------------------
    */

    await transaction.commit();

    return {
      order,
      orderItem,
      customer,
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};

module.exports = {
  createBikeRentalOrder,
  createOrder,
};
