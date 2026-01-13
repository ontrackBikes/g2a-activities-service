const { products, bikeRentalLocations } = require("../data/productConfig");
const moment = require("moment");

const bikeRentals = {
  /* -------------------- PRODUCT INFO -------------------- */
  productInfo() {
    const product = products.find(
      (p) => p.productType === "bike-rentals" && p.active
    );

    if (!product) {
      return { success: false, message: "Bike rentals not available" };
    }

    return { success: true, data: product };
  },

  /* -------------------- LOCATION HELPERS -------------------- */
  getLocationByName(locationName) {
    if (!locationName) return null;

    return bikeRentalLocations.find(
      (loc) => loc.name.toLowerCase() === locationName.toLowerCase()
    );
  },

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
        paymentModes: loc.paymentModes,
        timings: loc.timings,
      }));
  },

  /* -------------------- PICKUP / DROP POINTS -------------------- */
  getPickupDropPoints(locationName) {
    const location = this.getLocationByName(locationName);

    if (!location) {
      return { success: false, message: "Location not found" };
    }

    return {
      success: true,
      data: location.pickupDropPoints || [],
    };
  },

  /* -------------------- PICKUP / DROP VALIDATION -------------------- */
  validatePickupDrop({ location, pickupType, dropType, pickup, drop }) {
    const pickupPoints = location.pickupDropPoints || [];

    /* ---------- PICKUP ---------- */
    if (pickupType === "self-pickup") {
      if (!pickup) {
        return {
          success: false,
          message: "Pickup point is required for self pickup",
        };
      }

      const pickupExists = pickupPoints.some(
        (p) => p.name.toLowerCase() === pickup.toLowerCase()
      );

      if (!pickupExists) {
        return {
          success: false,
          message: "Invalid pickup point selected",
        };
      }
    }

    if (pickupType === "hotel-delivery") {
      if (!location.hotelDelivery?.enabled) {
        return {
          success: false,
          message: "Hotel delivery not available at this location",
        };
      }
    }

    /* ---------- DROP ---------- */
    if (dropType === "self-drop") {
      if (!drop) {
        return {
          success: false,
          message: "Drop point is required for self drop",
        };
      }

      const dropExists = pickupPoints.some(
        (p) => p.name.toLowerCase() === drop.toLowerCase()
      );

      if (!dropExists) {
        return {
          success: false,
          message: "Invalid drop point selected",
        };
      }
    }

    if (dropType === "hotel-pickup") {
      if (!location.hotelPickup?.enabled) {
        return {
          success: false,
          message: "Hotel pickup not available at this location",
        };
      }
    }

    return { success: true };
  },

  /* -------------------- AVAILABILITY CHECK -------------------- */
  checkAvailability({
    locationName,
    startDate,
    endDate,
    quantity,
    pickupType,
    dropType,
    pickup,
    drop,
  }) {
    const product = products.find(
      (p) => p.productType === "bike-rentals" && p.active
    );
    if (!product) {
      return { success: false, message: "Product not available" };
    }

    const location = this.getLocationByName(locationName);
    if (!location) {
      return { success: false, message: "Location not found" };
    }

    /* ✅ Pickup / Drop Validation */
    const pickupDropValidation = this.validatePickupDrop({
      location,
      pickupType,
      dropType,
      pickup,
      drop,
    });

    if (!pickupDropValidation.success) {
      return pickupDropValidation;
    }

    /* ---- Date, quantity, blackout logic stays SAME ---- */

    const rentalDays = moment(endDate).diff(moment(startDate), "days") || 1;

    const pricing = location.paymentModes.map((pm) => ({
      paymentType: pm.paymentType,
      label: pm.label,
      amountPerDay: pm.amount,
      total: pm.amount * rentalDays * quantity,
    }));

    return {
      success: true,
      data: {
        location: location.name,
        rentalDays,
        quantity,
        pricing,
        pickupType,
        dropType,
        pickup,
        drop,
        hotelDelivery: location.hotelDelivery,
        hotelPickup: location.hotelPickup,
        pickupDropPoints: location.pickupDropPoints,
        timings: location.timings,
      },
    };
  },
};

module.exports = { bikeRentals };
