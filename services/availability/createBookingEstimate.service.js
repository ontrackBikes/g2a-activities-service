const { randomUUID } = require("crypto");

const BookingEstimate = require("../../models/bookingEstimate.model");

const createBookingEstimate = async ({
  product,
  location,

  vendorProduct = null,
  vendorSchedule = null,
  vendorScheduleSlot = null,

  requestData = {},
  bookingData = {},

  pricing = {},
  quotation = {},

  metadata = {},

  source = "website",
}) => {
  return BookingEstimate.create({
    /**
     * Public Estimate ID
     */
    estimate_id: randomUUID(),

    /**
     * Product
     */
    product_id: product.id,

    location_id: location.id,

    /**
     * Vendor
     */
    vendor_product_id:
      vendorProduct?.id || null,

    vendor_id:
      vendorProduct?.vendor_id || null,

    vendor_schedule_id:
      vendorSchedule?.id || null,

    /**
     * Slot
     * Initially NULL.
     * Updated after customer selects one.
     */
    selected_slot_token: null,

    vendor_schedule_slot_id:
      vendorScheduleSlot?.id || null,

    /**
     * Booking
     */
    booking_mode:
      product.booking_mode,

    request_data: requestData,

    booking_data: bookingData,

    /**
     * Pricing
     */
    pricing,

    /**
     * Snapshot returned to customer
     */
    quotation,

    quotation_version: 1,

    /**
     * Internal metadata
     *
     * Example:
     * {
     *   slot_mapping: {}
     * }
     */
    metadata,

    /**
     * Source
     */
    source,

    /**
     * Estimate
     */
    status: "draft",

    expires_at: new Date(
      Date.now() + 15 * 60 * 1000,
    ),
  });
};

module.exports = {
  createBookingEstimate,
};