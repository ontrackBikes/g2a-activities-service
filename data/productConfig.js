module.exports = {
  products: [
    {
      productType: "bike-rentals",
      label: "Vehicle Rentals",
      description: "Self-drive bike rentals",
      active: true,
      advanceBookingBufferHours: 48,
      minRentalDays: 1,
      maxQuantity: 5,
      blackoutDates: ["2026-01-15", "2026-01-20"],
      pickupDropMessages: ["Pickup and drop available at all locations"],
      productThumbnailUrl:
        "https://fastly.picsum.photos/id/915/200/200.jpg?hmac=zZ-_EQ1TWG_LFblhB2BrD2CJYUhLEnobSCCthppN0ZE",
      inclusions: [
        "Helmets provided",
        "Free cancellation up to 24 hours before pickup",
        "24/7 roadside assistance",
        "No hidden charges",
      ],
    },
    {
      productType: "hotel-transfer",
      label: "Hotel Transfer",
      description: "Hotel pickup and drop",
      active: true,
      advanceBookingBufferHours: 48,
      minRentalDays: 1,
      maxQuantity: 5,
      blackoutDates: ["2026-01-16"],
    },
  ],
  bikeRentalLocations: [
    {
      name: "Port Blair",
      pickup: true,
      drop: true,
      maxQtyPerBooking: 2,
      totalStock: 10,
      blackoutDates: ["2026-01-24", "2026-01-25"],
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
