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
      blackoutDates: ["2026-01-15", "2026-01-20"],
      paymentModes: [
        { paymentType: "full", amount: 500, label: "Pay Full" },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
        },
      ],
      hotelDelivery: {
        enabled: true,
        onlineCharge: 0,
        infoText:
          "Free within city limits. Extra charges (~₹100) apply if outside.",
      },
      hotelPickup: {
        enabled: true,
        onlineCharge: 0,
        infoText:
          "Free within city limits. Extra charges (~₹100) apply if outside.",
      },
      timings: {
        season: "08:00 AM - 06:00 PM",
        offSeason: "08:00 AM - 06:00 PM",
      },
      pickupDropPoints: [
        {
          name: "Airport",
          address:
            "Port Blair Airport, Port Blair, Andaman and Nicobar Islands",
        },
        {
          name: "Ferry Terminal",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
        },
      ],
    },
    {
      name: "Hevelock Island",
      pickup: true,
      drop: true,
      maxQtyPerBooking: 2,
      totalStock: 10,
      blackoutDates: ["2026-01-15", "2026-01-20"],
      paymentModes: [
        { paymentType: "full", amount: 600, label: "Pay Full" },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
        },
      ],
      hotelDelivery: {
        enabled: true,
        onlineCharge: 0,
        infoText:
          "Free within city limits. Extra charges (~₹100) apply if outside.",
      },
      timings: {
        season: "09:00 AM - 06:00 PM",
        offSeason: "08:00 AM - 06:00 PM",
      },
      pickupDropPoints: [
        {
          name: "Airport",
          address:
            "Port Blair Airport, Port Blair, Andaman and Nicobar Islands",
        },
        {
          name: "Ferry Terminal",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
        },
      ],
    },
    {
      name: "Neil Island",
      pickup: true,
      drop: true,
      maxQtyPerBooking: 2,
      totalStock: 10,
      blackoutDates: ["2026-01-15", "2026-01-20"],
      paymentModes: [
        { paymentType: "full", amount: 800, label: "Pay Full" },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
        },
      ],
      hotelDelivery: {
        enabled: true,
        onlineCharge: 0,
        infoText:
          "Free within city limits. Extra charges (~₹100) apply if outside.",
      },
      timings: {
        season: "10:00 AM - 06:00 PM",
        offSeason: "10:00 AM - 06:00 PM",
      },
      pickupDropPoints: [
        {
          name: "Airport",
          address:
            "Port Blair Airport, Port Blair, Andaman and Nicobar Islands",
        },
        {
          name: "Ferry Terminal",
          address:
            "Phoenix Bay Jetty, Aberdeen Bazaar, Port Blair, Andaman and Nicobar Islands",
        },
      ],
    },
  ],
};
