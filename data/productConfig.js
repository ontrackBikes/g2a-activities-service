module.exports = {
  products: [
    {
      productType: "bike-rentals",
      label: "Bike Rentals",
      description: "Self-drive bike rentals",
      active: true,

      advanceBookingBufferHours: 48,
      minRentalDays: 1,

      // 🧪 PRODUCT-LEVEL blackout — affects ALL locations
      // Test: try picking Feb 24 or Feb 28 as pickup or within a range
      // blackoutDates: ["2026-02-24", "2026-02-28"],
      blackoutDates: [],

      productThumbnailUrl:
        "https://www.go2andaman.com/wp-content/uploads/2021/05/two-wheeler-rental-port-blair-andaman1-1.jpg",

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
            "The deposit will be refunded immediately at the time of return after vehicle inspection.",
        },
        damagePolicy:
          "Please take photos and a video of the scooter at pickup to ensure safety and a damage record. Any damages to the vehicle, missing items, or traffic violations will be assessed and deducted from your security deposit.",
        cancellationPolicy: {
          title: "Cancellation & Refund Policy",
          terms: [
            "Free cancellation up to 24 hours before scheduled pickup time",
            "50% refund if cancelled between 12-24 hours before pickup",
            "No refund for cancellations within 12 hours of pickup time",
            "Full refund will be provided in case of last-minute flight or ferry cancellation",
            "Free rescheduling allowed if informed 24 hours before pickup",
            "Refunds will be processed within 5-7 business days",
          ],
        },
      },
    },
  ],

  bikeRentalLocations: [
    {
      name: "Port Blair",
      maxQtyPerBooking: 5,

      // 🧪 PORT BLAIR-ONLY blackout — only affects Port Blair widget
      // Test: try picking Feb 26 on the Port Blair page
      // Feb 24 and Feb 28 should ALSO be blocked (from product level)
      // blackoutDates: ["2026-02-26"],
      blackoutDates: [],

      peakMonths: [0, 1, 2, 3, 11],

      paymentModes: [
        {
          paymentType: "full",
          amount: 600,
          label: "Pay Full",
          enabled: true,
          description: "",
        },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
          enabled: false,
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
        },
      ],

      timings: {
        season: "10:00 AM",
        offSeason: "11:00 AM",
        availableTimeSlots: ["9 AM", "10 AM", "11 AM", "12 PM"],
      },

      pickupDropPoints: [
        {
          name: "Veer Savarkar International Airport",
          address:
            "Veer Savarkar International Airport, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
        {
          name: "Phoenix Bay Jetty",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
        {
          name: "Haddo Jetty",
          address: "Haddo Jetty, Port Blair, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
      ],
    },

    {
      name: "Havelock",
      maxQtyPerBooking: 5,

      // 🧪 HAVELOCK-ONLY blackout — only affects Havelock widget
      // Test: try picking Mar 2 on the Havelock page
      // Feb 24 and Feb 28 should ALSO be blocked (from product level)
      // blackoutDates: ["2026-03-02"],
      blackoutDates: [],

      peakMonths: [0, 1, 2, 3, 11],

      paymentModes: [
        {
          paymentType: "full",
          amount: 500,
          label: "Pay Full",
          enabled: true,
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
        },
      ],

      timings: {
        season: "10:00 AM",
        offSeason: "11:00 AM",
        availableTimeSlots: ["9 AM", "10 AM", "11 AM", "12 PM"],
      },

      pickupDropPoints: [
        {
          name: "Havelock Jetty",
          address:
            "Havelock Jetty, Havelock Island, Andaman and Nicobar Islands",
          pickup: true,
          drop: true,
        },
        {
          name: "Go2Andaman Outlet (Srisha Travels) - Opposite Full Moon Cafe",
          address:
            "3, Havelock Island, Swaraj Dweep, Govind Nagar, Andaman and Nicobar Islands 744211",
          pickup: true,
          drop: true,
        },
      ],
    },
    {
      name: "Neil",
      maxQtyPerBooking: 5,

      // 🧪 Neil-ONLY blackout — only affects Neil widget
      // Test: try picking Mar 2 on the Neil page
      // Feb 24 and Feb 28 should ALSO be blocked (from product level)
      // blackoutDates: ["2026-03-02"],
      blackoutDates: [],

      peakMonths: [0, 1, 2, 3, 11],

      paymentModes: [
        {
          paymentType: "full",
          amount: 500,
          label: "Pay Full",
          enabled: true,
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
        },
        {
          title: "Hotel Pickup",
          type: "hotel",
          enabled: true,
          onlineChargeApplicable: false,
          onlineCharge: 0,
          label: "We will deliver the vehicle to your hotel",
          infoText:
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
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
            "Free within city limits. Extra charges (~₹100) apply if outside. Our agent will contact you for more details.",
        },
      ],

      timings: {
        season: "10:00 AM",
        offSeason: "11:00 AM",
        availableTimeSlots: ["9 AM", "10 AM", "11 AM", "12 PM"],
      },

      pickupDropPoints: [
        {
          name: "Neil Market",
          address: "Neil Kendra, Shaheed, Neil Kendra, 744104",
          pickup: true,
          drop: true,
        },
        {
          name: "Go2Andaman Outlet (Saha Travels) - 200m from Neil Jetty",
          address:
            "Neil Jetty, Bharatpur, Neil Island, Andaman and Nicobar Islands 744104",
          pickup: true,
          drop: true,
        },
      ],
    },
  ],
};
