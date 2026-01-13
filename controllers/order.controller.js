const { validate } = require("../schemas/bikeRentalsOrder.schema");
const googleSheetService = require("../services/googleSheetService");
const productService = require("../services/productService");
const razorpayService = require("../services/razorpayService");

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

    // Validate input using your schema helper
    const errors = validate(req.body);
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

    /* -------------------- PRICING -------------------- */
    const pricing = availability.data.pricing.find(
      (p) => p.paymentType.toLowerCase() === paymentType.toLowerCase()
    );

    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: `Invalid paymentType. Available options: ${availability.data.pricing
          .map((p) => p.label)
          .join(", ")}`,
      });
    }

    /* -------------------- GOOGLE SHEET ORDER -------------------- */
    const sheetResult = await googleSheetService.createOrder({
      productType: "bike-rentals",
      locationName,
      startDate,
      endDate,
      quantity,
      pickupType,
      dropType,
      pickup,
      drop,
      pickupHotelName,
      dropHotelName,
      pricing,
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

    if (usePaymentLink) {
      /* -------------------- RAZORPAY PAYMENT LINK -------------------- */
      paymentResult = await razorpayService.createPaymentLink({
        amount: pricing.total,
        currency: "INR",
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          mobile: customer.mobile,
        },
        description: `Bike Rental Payment - ${orderId}`,
        notes: {
          orderId,
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
        },
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay payment link",
        });
      }
    } else {
      /* -------------------- RAZORPAY ORDER -------------------- */
      paymentResult = await razorpayService.createRazorpayOrder({
        orderId,
        totalPrice: pricing.total,
        currency: "INR",
        notes: {
          orderId,
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
          customerName: `${customer.firstName} ${customer.lastName}`,
          paymentType: pricing.label,
        },
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }
    }

    /* -------------------- SUCCESS -------------------- */
    res.json({
      success: true,
      orderId,
      pricing,
      payment: paymentResult.data,
      paymentTypeUsed: usePaymentLink ? "link" : "order",
    });
  } catch (error) {
    console.error("Error creating bike rental order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createBikeRentalOrder,
};
