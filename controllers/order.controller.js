const { validate } = require("../schemas/bikeRentalsOrder.schema");
const googleSheetService = require("../services/googleSheetService");
const productService = require("../services/productService");
const razorpayService = require("../services/razorpayService");

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
    const availability = productService.bikeRentals.checkAvailability({
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
      (p) => p.paymentType === paymentType
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

module.exports = {
  createBikeRentalOrder,
};
