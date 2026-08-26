module.exports = Object.freeze({
  // Core
  CUSTOMER_DETAILS: "customer_details",
  PARTICIPANTS: "participants",
  EMERGENCY_CONTACT: "emergency_contact",

  // Activity Specific
  MEDICAL_DECLARATION: "medical_declaration",
  DRIVER_LICENSE: "driver_license",
  RENTAL_DETAILS: "rental_details",
  FERRY_SEAT_SELECTION: "ferry_seat_selection",
  KYC_PER_PASSENGER: "kyc_per_passanger",
  KYC_UPTO_MAX: "kyc_upto_max",
  INFANT_DOCUMENTS: "infant_documents",

  // Optional
  ADDONS: "addons",
  OPT_FOR_PICKUP_AND_DROP: "opt_for_pickup_and_drop",
  HAS_AGREED_TO_PERMIT_CHARGE: "has_agreed_to_permit_charge",

  // Generic customer agreement checkbox. Unlike other sections, this one can
  // be added multiple times to a single booking template - each instance
  // needs its own config.key (unique per template) and config.description
  // (the agreement text shown to the customer). See schemas/bookingTemplate.schema.js
  // and schemas/bookingPayload.schema.js for how repeated instances are validated.
  AGREE_TO: "agree_to",

  // Checkout
  REVIEW: "review",
  PAYMENT: "payment",
  FLIGHTDETAILS: "flight_details",
  FERRYDETAILS: "ferry_details",
});