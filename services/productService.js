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

    return {
      productType: product.productType,
      label: product.label,
      description: product.description,
      advanceBookingBufferHours: product.advanceBookingBufferHours,
      minRentalDays: product.minRentalDays,
      maxQuantity: product.maxQuantity,
      blackoutDates: product.blackoutDates,
      pickupDropMessages: product.pickupDropMessages || [],
      productThumbnailUrl: product.productThumbnailUrl || null,
      inclusions: product.inclusions || [],
    };
  },

  /* -------------------- LOCATION HELPERS -------------------- */
  getLocationByName(locationName) {
    if (!locationName) return null;

    return bikeRentalLocations.find(
      (loc) => loc.name.toLowerCase() === locationName.toLowerCase()
    );
  },

  getLocations({ pickupOnly = false, dropOnly = false } = {}) {
    const currentMonth = new Date().getMonth();

    return bikeRentalLocations
      .filter((loc) => {
        if (pickupOnly && !loc.pickup) return false;
        if (dropOnly && !loc.drop) return false;
        return true;
      })
      .map((loc) => {
        const peakMonths = Array.isArray(loc.peakMonths) ? loc.peakMonths : [];

        return {
          name: loc.name,
          pickup: loc.pickup,
          drop: loc.drop,
          maxQtyPerBooking: loc.maxQtyPerBooking,
          totalStock: loc.totalStock,
          paymentModes: loc.paymentModes,
          timings: loc.timings,
          deliveryOptions: loc.deliveryOptions.filter((o) => o.enabled),
          dropOptions: loc.dropOptions.filter((o) => o.enabled),
          peakMonths,
          isPeakMonth: peakMonths.includes(currentMonth),
        };
      });
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

    /* ---------- PICKUP OPTION ---------- */
    const pickupOption = location.deliveryOptions.find(
      (o) => o.type === pickupType && o.enabled
    );

    if (!pickupOption) {
      return {
        success: false,
        message: `${pickupType} pickup not available at this location`,
      };
    }

    if (pickupType === "self-pickup") {
      if (!pickup) {
        return {
          success: false,
          message: "Pickup point is required for self pickup",
        };
      }

      const pickupExists = pickupPoints.some(
        (p) => p.name.toLowerCase() === pickup.toLowerCase() && p.pickup
      );

      if (!pickupExists) {
        return {
          success: false,
          message: "Invalid pickup point selected",
        };
      }
    }

    /* ---------- DROP OPTION ---------- */
    const dropOption = location.dropOptions.find(
      (o) => o.type === dropType && o.enabled
    );

    if (!dropOption) {
      return {
        success: false,
        message: `${dropType} drop not available at this location`,
      };
    }

    if (dropType === "self-drop") {
      if (!drop) {
        return {
          success: false,
          message: "Drop point is required for self drop",
        };
      }

      const dropExists = pickupPoints.some(
        (p) => p.name.toLowerCase() === drop.toLowerCase() && p.drop
      );

      if (!dropExists) {
        return {
          success: false,
          message: "Invalid drop point selected",
        };
      }
    }

    return {
      success: true,
      pickupOption,
      dropOption,
    };
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

    /* ---------- PICKUP / DROP VALIDATION ---------- */
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

    const { pickupOption, dropOption } = pickupDropValidation;

    /* ---------- DATE LOGIC ---------- */
    const rentalDays = moment(endDate).diff(moment(startDate), "days") || 1;

    /* ---------- BASE PRICING ---------- */
    const pricing = location.paymentModes
      .filter((pm) => pm.enabled)
      .map((pm) => ({
        paymentType: pm.paymentType,
        label: pm.label,
        amountPerDay: pm.amount,
        rentalAmount: pm.amount * rentalDays * quantity,
      }));

    /* ---------- PICKUP / DROP CHARGES ---------- */
    const pickupCharge = pickupOption.onlineCharge || 0;
    const dropCharge = dropOption.onlineCharge || 0;
    const addonCharges = pickupCharge + dropCharge;

    return {
      success: true,
      data: {
        location: location.name,
        rentalDays,
        quantity,
        pickupType,
        dropType,
        pickup,
        drop,
        pricing: pricing.map((p) => ({
          ...p,
          pickupCharge,
          dropCharge,
          total: p.rentalAmount + addonCharges,
        })),
        deliveryOptions: location.deliveryOptions,
        dropOptions: location.dropOptions,
        pickupDropPoints: location.pickupDropPoints,
        timings: location.timings,
      },
    };
  },

  checkAvailabilityPreflight({ locationName, startDate, endDate, quantity }) {
    /* ---------- PRODUCT CHECK ---------- */
    const product = products.find(
      (p) => p.productType === "bike-rentals" && p.active
    );

    if (!product) {
      return { success: false, message: "Product not available" };
    }

    /* ---------- LOCATION CHECK ---------- */
    const location = this.getLocationByName(locationName);
    if (!location) {
      return { success: false, message: "Location not found" };
    }

    /* ---------- DATE VALIDATION ---------- */
    if (!startDate || !endDate) {
      return { success: false, message: "Start and end date are required" };
    }

    const rentalDays = moment(endDate).diff(moment(startDate), "days");

    if (rentalDays <= 0) {
      return { success: false, message: "Invalid date range" };
    }

    /* ---------- QUANTITY CHECK ---------- */
    if (!quantity || quantity <= 0) {
      return { success: false, message: "Invalid quantity" };
    }

    /* ---------- SUCCESS ---------- */
    return {
      success: true,
      data: {
        location: location.name,
        startDate,
        endDate,
        rentalDays,
        quantity,
        available: true,
        timings: location.timings,
        pickupDropPoints: location.pickupDropPoints,
      },
    };
  },
};

module.exports = { bikeRentals };
