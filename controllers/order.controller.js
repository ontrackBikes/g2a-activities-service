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
      pickup = true,
      drop = true,
      customer,
      paymentType, // "full" or "partial"
    } = req.body;

    // Validate required fields
    if (
      !locationName ||
      !startDate ||
      !endDate ||
      !quantity ||
      !customer?.firstName ||
      !customer?.lastName ||
      !customer?.countryCode ||
      !customer?.mobile ||
      !customer?.email ||
      !paymentType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: locationName, startDate, endDate, quantity, customer details, paymentType",
      });
    }

    // ✅ 1. Get availability and pricing
    const availability = productService.bikeRentals.checkAvailability({
      locationName,
      startDate,
      endDate,
      quantity,
      pickup,
      drop,
    });

    if (!availability.success) {
      return res.status(400).json(availability);
    }

    // Find preferred pricing
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

    // ✅ 2. Create order in Google Sheet
    const sheetResult = await googleSheetService.createOrder({
      productType: "bike-rentals",
      locationName,
      startDate,
      endDate,
      quantity,
      pickup,
      drop,
      pricing,
      customer,
    });

    if (!sheetResult.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to create order in sheet" });
    }

    const orderId = sheetResult.orderId;

    // ✅ 3. Create Razorpay order
    const rzpResult = await razorpayService.createRazorpayOrder({
      orderId,
      totalPrice: pricing.total,
      currency: "INR",
      notes: {
        orderId,
        location: locationName,
        startDate,
        endDate,
        quantity,
        pickup,
        drop,
        customerName: `${customer.firstName} ${customer.lastName}`,
        paymentType: pricing.label,
      },
    });

    if (!rzpResult.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to create Razorpay order" });
    }

    res.json({
      success: true,
      orderId,
      sheetResult,
      razorpayOrder: rzpResult.data,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createBikeRentalOrder,
};
