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
      blackoutDates: ["2026-01-15", "2026-01-20"],
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
      name: "Airport",
      pricePerDay: 500,
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
          "Free within city limits. Extra charges (~₹100) apply if outside (verified by agent).",
      },
      timings: {
        season: "08:00 AM - 06:00 PM",
        offSeason: "08:00 AM - 06:00 PM",
      },
    },
    {
      name: "City Center",
      pricePerDay: 450,
      pickup: true,
      drop: false,
      maxQtyPerBooking: 1,
      totalStock: 5,
      blackoutDates: ["2026-01-14"],
      paymentModes: [
        { paymentType: "full", amount: 800, label: "Pay Full" },
        {
          paymentType: "partial",
          amount: 200,
          label: "Pay after confirmation",
        },
      ],
      hotelDelivery: {
        enabled: false,
        onlineCharge: 0,
        infoText:
          "Free within city limits. Extra charges (~₹100) apply if outside (verified by agent).",
      },
      timings: {
        season: "08:00 AM - 06:00 PM",
        offSeason: "08:00 AM - 06:00 PM",
      },
    },
  ],
};
