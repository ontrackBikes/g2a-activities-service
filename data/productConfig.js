module.exports = {
  products: [
    {
      productType: "bike-rentals",
      label: "Bike Rentals",
      description: "Self-drive bike rentals",
      active: true,

      advanceBookingBufferHours: 48,
      minRentalDays: 1,
      maxQuantity: 5,

      // 🧪 PRODUCT-LEVEL blackout — affects ALL locations
      // Test: try picking Feb 24 or Feb 28 as pickup or within a range
      blackoutDates: ["2026-02-24", "2026-02-28"],

      productThumbnailUrl:
        "https://fastly.picsum.photos/id/915/200/200.jpg?hmac=zZ-_EQ1TWG_LFblhB2BrD2CJYUhLEnobSCCthppN0ZE",

      inclusions: [
        "Helmets provided",
        "Free cancellation up to 24 hours before pickup",
        "24/7 roadside assistance",
        "No hidden charges",
      ],

      policies: {
        securityDeposit: {
          amount: 2000,
          currency: "INR",
          description:
            "A refundable security deposit is required at the time of vehicle pickup.",
          refundConditions:
            "The deposit will be refunded within 48 hours after vehicle return, provided there are no damages or violations.",
        },
        damagePolicy:
          "Any damages to the vehicle, missing items, or traffic violations will be assessed and deducted from your security deposit. You will be notified of any deductions with supporting evidence.",
        cancellationPolicy: {
          title: "Cancellation & Refund Policy",
          terms: [
            "Free cancellation up to 24 hours before scheduled pickup time",
            "50% refund if cancelled between 12-24 hours before pickup",
            "No refund for cancellations within 12 hours of pickup time",
            "Refunds will be processed within 5-7 business days",
          ],
        },
      },
    },
  ],

  bikeRentalLocations: [
    {
      name: "Port Blair",
      maxQtyPerBooking: 2,
      totalStock: 10,

      // 🧪 PORT BLAIR-ONLY blackout — only affects Port Blair widget
      // Test: try picking Feb 26 on the Port Blair page
      // Feb 24 and Feb 28 should ALSO be blocked (from product level)
      blackoutDates: ["2026-02-26"],

      peakMonths: [0, 1, 2, 3, 11],

      paymentModes: [
        {
          paymentType: "full",
          amount: 500,
          label: "Pay Full",
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
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "Pick up the vehicle yourself",
          infoText: null,
        },
        {
          title: "Hotel Pickup",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "We will deliver the vehicle to your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you.",
        },
      ],

      dropOptions: [
        {
          title: "Self Drop",
          type: "self-drop",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "Drop the vehicle yourself",
          infoText: null,
        },
        {
          title: "Hotel Drop",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "We will collect the vehicle from your hotel",
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

    {
      name: "Havelock",
      maxQtyPerBooking: 2,
      totalStock: 10,

      // 🧪 HAVELOCK-ONLY blackout — only affects Havelock widget
      // Test: try picking Mar 2 on the Havelock page
      // Feb 24 and Feb 28 should ALSO be blocked (from product level)
      blackoutDates: ["2026-03-02"],

      peakMonths: [0, 1, 2, 3, 11],

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
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "Pick up the vehicle yourself",
          infoText:
            "Free within city limits. Extra charges (~₹100) may apply if outside.",
        },
        {
          title: "Hotel Pickup",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "We will deliver the vehicle to your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside.",
        },
      ],

      dropOptions: [
        {
          title: "Self Drop",
          type: "self-drop",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "Drop the vehicle yourself",
          infoText: null,
        },
        {
          title: "Hotel Drop",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "We will collect the vehicle from your hotel",
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
          name: "Ferry Terminal",
          address:
            "Havelock Island Jetty, Havelock Island, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
      ],
    },
  ],
};
