const { VendorScheduleSlot } = require("../models");
const BookingEstimate = require("../models/bookingEstimate.model");

module.exports.getEstimate = async (req, res) => {
  try {
    const estimate = await BookingEstimate.findOne({
      where: {
        estimate_id: req.params.estimate_id,
      },
    });

    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: "Estimate not found",
      });
    }

    if (estimate.status === "expired") {
      return res.status(410).json({
        success: false,
        message: "Estimate has expired",
      });
    }

    return res.status(200).json({
      success: true,
      data: estimate.quotation,
    });

  } catch (error) {
    console.error(
      "[BookingEstimateController] getEstimate",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch estimate",
    });
  }
};

// controllers/bookingEstimate.controller.js

module.exports.selectEstimateSlot = async (req, res) => {
  try {
    const { estimate_id } = req.params;
    const { slot_token } = req.body;

    const estimate = await BookingEstimate.findOne({
      where: {
        estimate_id,
        status: "draft",
      },
    });
    

    if (!estimate) {
      return res.status(404).json({
        success: false,
        message: "Estimate not found.",
      });
    }

    /**
     * Already expired
     */

    if (new Date() > estimate.expires_at) {
      estimate.status = "expired";
      await estimate.save();

      return res.status(410).json({
        success: false,
        message: "Estimate has expired.",
      });
    }

    /**
     * Booking quotation
     */

    const quotation = {
      ...(estimate.quotation || {}),
    };

    /**
     * No slots?
     */

    if (estimate.booking_mode !== "single_date") {
      return res.status(200).json({
        success: true,
        data: estimate.quotation,
      });
    }

    /**
     * Slot token required
     */

    if (!slot_token) {
      return res.status(400).json({
        success: false,
        message: "slot_token is required.",
      });
    }

    console.log("🚀 ~ estimate:", estimate.metadata)

    /**
     * Metadata mapping
     */

    const slotId =
      estimate.metadata?.slot_mapping?.[slot_token];

      
    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "Invalid slot id.",
      });
    }

    const slot = await VendorScheduleSlot.findOne({
      where: {
        id: slotId,
      },
    });

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: "Invalid slot.",
      });
    }

    /**
     * Quantity
     */

    const quantity =
      Number(estimate.booking_data?.guests || 1);

    /**
     * Update internal ids
     */

    estimate.selected_slot_token =
      slot_token;

    estimate.vendor_schedule_slot_id =
      slot.id;

    estimate.vendor_schedule_id =
      slot.vendor_schedule_id;

    /**
     * Update pricing
     */

    estimate.pricing = {
      ...estimate.pricing,

      unit_price: slot.price,

      subtotal: slot.price * quantity,

      grand_total: slot.price * quantity,
    };

    /**
     * Update quotation
     */

    quotation.pricing = estimate.pricing;

    quotation.availability = {
      ...quotation.availability,

      selected_slot: {
        token: slot_token,

        name: slot.slot_name,

        start_time: slot.start_time,

        end_time: slot.end_time,

        price: slot.price,
      },
    };

    estimate.quotation = quotation;

    await estimate.save();

    return res.status(200).json({
      success: true,

      message: "Slot selected.",

      data: quotation,
    });
  } catch (error) {
    console.error(
      "[BookingEstimate] selectEstimateSlot",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update estimate.",
    });
  }
};
