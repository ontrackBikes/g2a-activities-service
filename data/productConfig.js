module.exports = {
  products: [
    {
      /* ---------------------------------------------------
       * PRODUCT IDENTIFICATION
       * --------------------------------------------------- */

      productType: "bike-rentals",
      // Unique identifier for the product.
      // Used internally for booking logic, filtering, and pricing rules.

      label: "Vehicle Rentals",
      // Human-readable name shown in UI (cards, dropdowns, headers).

      description: "Self-drive bike rentals",
      // Short description displayed on product listing or details page.

      active: true,
      // If false, this product cannot be booked by users.
      // Useful for temporarily disabling bookings without deleting the product.

      /* ---------------------------------------------------
       * BOOKING RULES
       * --------------------------------------------------- */

      advanceBookingBufferHours: 48,
      // Minimum time (in hours) required before the rental can start.
      // Example:
      // Today: 22 Jan, 4:00 PM
      // Earliest allowed start date/time: 24 Jan, 00:00:00 AM (we take start of the day for now)
      // Frontend may allow selecting only dates from that point onward.

      minRentalDays: 1,
      // Minimum number of days required for a valid booking.

      maxQuantity: 5,
      // Maximum number of vehicles that can be booked in a single booking.
      // Can be overridden by location.maxQtyPerBooking if defined - SYSTEM cheks checks in bikeRentalLocations[maxQtyPerBooking] and then global product[maxQuantity]

      blackoutDates: ["2026-01-15", "2026-01-20"],
      // Dates on which booking is not allowed for this product.
      // Format: YYYY-MM-DD
      // Can be overridden by location.blackoutDates if provided - SYSTEM cheks checks in location[blackoutDates] and then global product[blackoutDates]
      // These dates should be blocked in both backend validation and frontend date picker.

      /* ---------------------------------------------------
       * DISPLAY / UI CONFIGURATION
       * --------------------------------------------------- */

      productThumbnailUrl:
        "https://fastly.picsum.photos/id/915/200/200.jpg?hmac=zZ-_EQ1TWG_LFblhB2BrD2CJYUhLEnobSCCthppN0ZE",
      // Thumbnail image used in product cards and listings.

      /* ---------------------------------------------------
       * INCLUSIONS
       * --------------------------------------------------- */

      inclusions: [
        "Helmets provided",
        "Free cancellation up to 24 hours before pickup",
        "24/7 roadside assistance",
        "No hidden charges",
      ],
      // List of features or benefits included with the rental.
      // Displayed on product detail pages and booking summaries.
    },
  ],

  bikeRentalLocations: [
    {
      /* ---------------------------------------------------
       * LOCATION IDENTIFICATION & CAPABILITIES
       * --------------------------------------------------- */

      name: "Port Blair",
      // Unique location name.
      // Must be passed to booking widget and APIs.
      // Used for location-based availability, pricing, and rules.

      maxQtyPerBooking: 2,
      // Maximum number of vehicles allowed per booking at this location.
      // Overrides product.maxQuantity if defined.

      totalStock: 10,
      // Total available vehicles at this location.
      // Currently static; later can be replaced with real-time inventory logic.

      /* ---------------------------------------------------
       * DATE & SEASON RULES
       * --------------------------------------------------- */

      blackoutDates: ["2026-01-25"],
      // Location-specific blackout dates.
      // SYSTEM CHECK ORDER:
      // 1️⃣ Location blackoutDates (checked first)
      // 2️⃣ Product-level blackoutDates (global)
      // If date exists here, booking is blocked even if product allows it.

      peakMonths: [0, 1, 2, 3, 11, 12],
      // Months considered peak season for this location.
      // Month index follows JS Date convention:
      // 0 = Jan, 1 = Feb, ... 11 = Dec
      // Used for:
      // - Showing seasonal timings
      // - Future surge pricing or restrictions

      /* ---------------------------------------------------
       * PAYMENT CONFIGURATION
       * --------------------------------------------------- */

      paymentModes: [
        {
          paymentType: "full",
          amount: 500,
          label: "Pay Full",
          enabled: false,
          description:
            "Full payment is not available for this booking, please pay partially.",
          // If enabled is false, this option is hidden or disabled in UI.
        },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
          enabled: true,
          description: "",
          // If multiple payment modes are enabled,
          // the first enabled option becomes default in UI.
        },
      ],
      // Only one payment mode needs to be enabled.
      // If both are enabled, user can choose; first enabled is default.

      /* ---------------------------------------------------
       * PICKUP (DELIVERY) OPTIONS
       * --------------------------------------------------- */

      deliveryOptions: [
        {
          title: "Self Pickup",
          type: "self-pickup",
          enabled: true,

          onlineChargeApplicable: true,
          // If true → onlineCharge is collected during booking.
          // If false → final charge is decided by agent offline.

          onlineCharge: 0,
          // Must be 0 when onlineChargeApplicable is false.

          label: "We will drop the vehicle at your hotel",
          // Short UI label shown in booking flow.

          infoText: null,
          // Optional helper text shown below the option.
        },
        {
          title: "Hotel Pickup",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: true,
          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you.",
        },
      ],

      /* ---------------------------------------------------
       * DROP OPTIONS
       * --------------------------------------------------- */

      dropOptions: [
        {
          title: "Self Drop",
          type: "self-drop",
          enabled: true,
          onlineChargeApplicable: true,
          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText: null,
        },
        {
          title: "Hotel Drop",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          // Charge decided later by agent

          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside.",
        },
      ],

      /* ---------------------------------------------------
       * OPERATIONAL TIMINGS
       * --------------------------------------------------- */

      timings: {
        season: "08:00 AM - 06:00 PM",
        // Displayed when booking month is peakMonths

        offSeason: "08:00 AM - 06:00 PM",
        // Displayed for non-peak months
      },

      /* ---------------------------------------------------
       * PICKUP & DROP POINTS
       * --------------------------------------------------- */

      pickupDropPoints: [
        {
          name: "Airport",
          address:
            "Port Blair Airport, Port Blair, Andaman and Nicobar Islands",

          pickup: true,
          // Pickup allowed from this point

          drop: true,
          // Drop allowed at this point
          // For allowing both, set pickup & drop to true
        },
        {
          name: "Ferry Terminal",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
      ],
    },

    {
      name: "Havelock",
      pickup: true,
      drop: true,
      maxQtyPerBooking: 2,
      totalStock: 10,
      blackoutDates: ["2026-01-15", "2026-01-20"],
      peakMonths: [0, 1, 2, 3, 11, 12],
      paymentModes: [
        {
          paymentType: "full",
          amount: 500,
          label: "Pay Full - Not Available",
          enabled: false,
          description:
            "Full payment is not available for this booking, please pay partially.",
        },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
          enabled: true,
          description: "",
        },
      ],
      deliveryOptions: [
        {
          title: "Self Pickup",
          type: "self-pickup",
          enabled: true,
          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText:
            "We give free delivery upto city limits, in case the hotel is outside the city additional charge  (~₹100) may apply.",
        },
        {
          title: "Hotel Pickup",
          type: "hotel",
          enabled: true,
          onlineCharge: 100,
          label: "We will drop the vehicle at your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside.",
        },
      ],
      dropOptions: [
        {
          title: "Self Drop",
          type: "self-drop",
          enabled: true,
          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText: null,
        },
        {
          title: "Hotel Drop",
          type: "hotel",
          enabled: true,
          onlineCharge: 0,
          label: "We will drop the vehicle at your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside.",
        },
      ],
      timings: {
        season: "08:00 AM - 06:00 PM",
        offSeason: "08:00 AM - 06:00 PM",
      },
      pickupDropPoints: [
        {
          name: "Airport",
          address:
            "Port Blair Airport, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
        {
          name: "Ferry Terminal",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
      ],
    },
  ],
};
