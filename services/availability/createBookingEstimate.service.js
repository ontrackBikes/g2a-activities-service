const { randomUUID } = require("crypto");

const BookingEstimate = require("../../models/bookingEstimate.model");

const saveBookingEstimate = async ({
  estimateId = null,

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
  const payload = {
    /**
     * Product
     */
    product_id: product.id,
    location_id: location.id,

    /**
     * Vendor
     */
    vendor_product_id: vendorProduct?.id || null,
    vendor_id: vendorProduct?.vendor_id || null,
    vendor_schedule_id: vendorSchedule?.id || null,

    /**
     * Slot
     */
    vendor_schedule_slot_id: vendorScheduleSlot?.id || null,

    /**
     * Booking
     */
    booking_mode: product.booking_mode,
    request_data: requestData,
    booking_data: bookingData,

    /**
     * Pricing
     */
    pricing,

    /**
     * Snapshot
     */
    quotation,
    quotation_version: 1,

    /**
     * Metadata
     */
    metadata,

    /**
     * Source
     */
    source,

    /**
     * Status
     */
    status: "draft",

    /**
     * Extend expiry on every update
     */
    expires_at: new Date(Date.now() + 15 * 60 * 1000),
  };

  /**
   * Update existing estimate
   */
  if (estimateId) {
    const estimate = await BookingEstimate.findOne({
      where: {
        estimate_id: estimateId,
        status: "draft",
      },
    });

    if (estimate) {
      await estimate.update(payload);
      return estimate;
    }
  }

  /**
   * Create new estimate
   */
  return BookingEstimate.create({
    estimate_id: randomUUID(),

    selected_slot_token: null,

    ...payload,
  });
};

module.exports = {
  saveBookingEstimate,
};