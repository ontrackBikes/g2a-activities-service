const { products, bikeRentalLocations } = require("../data/productConfig");
const moment = require("moment");

const bikeRentals = {
  // Get all bike rental locations, with optional pickup/drop filters
  getLocations({ pickupOnly = false, dropOnly = false } = {}) {
    return bikeRentalLocations
      .filter((loc) => {
        if (pickupOnly && !loc.pickup) return false;
        if (dropOnly && !loc.drop) return false;
        return true;
      })
      .map((loc) => ({
        name: loc.name,
        pickup: loc.pickup,
        drop: loc.drop,
        maxQtyPerBooking: loc.maxQtyPerBooking,
        totalStock: loc.totalStock,
      }));
  },

  // Check availability
  checkAvailability({
    locationName,
    startDate,
    endDate,
    quantity,
    pickup = true,
    drop = true,
  }) {
    const product = products.find((p) => p.productType === "bike-rentals");
    if (!product || !product.active) {
      return { success: false, message: "Product not available" };
    }

    const location = bikeRentalLocations.find((l) => l.name === locationName);
    if (!location) {
      return { success: false, message: "Location not found" };
    }

    // Pickup/drop constraints
    if (pickup && !location.pickup) {
      return {
        success: false,
        message: "Pickup not available at this location",
      };
    }
    if (drop && !location.drop) {
      return { success: false, message: "Drop not available at this location" };
    }

    const now = moment();
    const start = moment(startDate, "YYYY-MM-DD");
    const end = moment(endDate, "YYYY-MM-DD");

    // Advance booking buffer
    if (start.diff(now, "hours") < product.advanceBookingBufferHours) {
      return {
        success: false,
        message: `Start date must be at least ${product.advanceBookingBufferHours} hours from now`,
      };
    }

    // Min rental days
    const rentalDays = end.diff(start, "days") + 1;
    if (rentalDays < product.minRentalDays) {
      return {
        success: false,
        message: `Minimum rental days is ${product.minRentalDays}`,
      };
    }

    // Product-level blackout dates
    for (let bd of product.blackoutDates) {
      const bdDate = moment(bd, "YYYY-MM-DD");
      if (start.isSameOrBefore(bdDate) && end.isSameOrAfter(bdDate)) {
        return {
          success: false,
          message: `Booking not available for date: ${bd}`,
        };
      }
    }

    // Location-level blackout dates
    for (let bd of location.blackoutDates) {
      const bdDate = moment(bd, "YYYY-MM-DD");
      if (start.isSameOrBefore(bdDate) && end.isSameOrAfter(bdDate)) {
        return {
          success: false,
          message: `Selected dates include location blackout date: ${bd}`,
        };
      }
    }

    // Quantity checks
    if (quantity > location.maxQtyPerBooking) {
      return {
        success: false,
        message: `Max quantity per booking is ${location.maxQtyPerBooking}`,
      };
    }
    if (quantity > location.totalStock) {
      return {
        success: false,
        message: "Not enough stock available at this location",
      };
    }

    // Total price
    const totalPrice = location.pricePerDay * rentalDays * quantity;

    return {
      success: true,
      data: {
        location: location.name,
        rentalDays,
        quantity,
        totalPrice,
        pricePerDay: location.pricePerDay,
        pickup: location.pickup,
        drop: location.drop,
        hotelDelivery: location.hotelDelivery,
        timings: location.timings,
        paymentModes: location.paymentModes,
      },
    };
  },
};

// Export a structured productService
module.exports = {
  bikeRentals,
  // future: hotelTransfers: { ... }
};
