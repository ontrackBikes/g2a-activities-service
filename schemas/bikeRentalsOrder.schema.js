const { bikeRentalLocations, products } = require("../data/productConfig");
const { parsePhoneNumberFromString } = require("libphonenumber-js");

/* ------------------ BASE SCHEMA ------------------ */

const schema = {
  locationName: { required: true, type: "string" },

  startDate: {
    required: true,
    type: "string",
    validate: (v) => !isNaN(Date.parse(v)) || "startDate must be a valid date",
  },

  endDate: {
    required: true,
    type: "string",
    validate: (v, payload) =>
      new Date(v) > new Date(payload.startDate) ||
      "endDate must be after startDate",
  },

  quantity: {
    required: true,
    type: "number",
    validate: (v) => v > 0 || "quantity must be greater than 0",
  },

  paymentType: {
    required: true,
    type: "string",
    enum: ["full", "partial"],
  },

  pickupType: {
    required: true,
    type: "string",
    enum: ["self-pickup", "hotel"],
  },

  dropType: {
    required: true,
    type: "string",
    enum: ["self-drop", "hotel"],
  },

  pickup: { type: "string" },
  drop: { type: "string" },

  pickupHotelName: {
    type: "string",
    validate: (v, payload) =>
      payload.pickupType === "hotel" && !v
        ? "pickupHotelName is required when pickupType is hotel"
        : true,
  },

  dropHotelName: {
    type: "string",
    validate: (v, payload) =>
      payload.dropType === "hotel" && !v
        ? "dropHotelName is required when dropType is hotel"
        : true,
  },

  "customer.firstName": { required: true, type: "string" },
  "customer.lastName": { required: true, type: "string" },
  "customer.countryCode": { required: true, type: "string" },

  "customer.mobile": {
    required: true,
    type: "string",
    validate: (v, payload) => {
      if (!v) return "mobile is required";
      if (!/^\d+$/.test(v)) return "mobile must contain only digits";

      const countryAbbr =
        payload?.customer?.countryCode?.match(/\((.*?)\)/)?.[1];

      if (!countryAbbr) {
        return "country code is required for mobile validation";
      }

      const phone = parsePhoneNumberFromString(v, countryAbbr);
      return phone?.isValid() || "invalid mobile number";
    },
  },

  "customer.email": {
    required: true,
    type: "string",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "email must be valid",
  },
};

/* ------------------ HELPERS ------------------ */

const getValue = (obj, path) =>
  path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

const error = (field, message) => ({ field, message });

/* ------------------ VALIDATORS ------------------ */

const validateRequired = (payload) => {
  const errors = [];

  for (const field in schema) {
    if (schema[field].required) {
      const value = getValue(payload, field);
      if (value === undefined || value === null || value === "") {
        errors.push(error(field, `${field} is required`));
      }
    }
  }
  return errors;
};

const validateTypes = (payload) => {
  const errors = [];

  for (const field in schema) {
    const rule = schema[field];
    const value = getValue(payload, field);

    if (value !== undefined && rule.type) {
      if (typeof value !== rule.type) {
        errors.push(error(field, `${field} must be of type ${rule.type}`));
      }
    }
  }
  return errors;
};

const validateEnums = (payload) => {
  const errors = [];

  for (const field in schema) {
    const rule = schema[field];
    const value = getValue(payload, field);

    if (rule.enum && value && !rule.enum.includes(value)) {
      errors.push(
        error(field, `${field} must be one of ${rule.enum.join(", ")}`),
      );
    }
  }
  return errors;
};

const validateCustom = (payload) => {
  const errors = [];

  for (const field in schema) {
    const rule = schema[field];
    const value = getValue(payload, field);

    if (rule.validate) {
      const result = rule.validate(value, payload);
      if (result !== true) {
        errors.push(error(field, result));
      }
    }
  }
  return errors;
};

/* ------------------ BUSINESS CONSTRAINTS ------------------ */

const validateConstraints = (payload) => {
  const errors = [];

  /* ---------- LOCATION ---------- */

  const location = bikeRentalLocations.find(
    (l) => l.name.toLowerCase() === payload.locationName?.toLowerCase(),
  );

  if (!location) {
    errors.push(error("locationName", "Location does not exist"));
    return errors;
  }

  /* ---------- PRODUCT ---------- */

  const product = products.find(
    (p) => p.productType === "bike-rentals" && p.active,
  );

  if (!product) {
    errors.push(error("product", "Product does not exist"));
    return errors;
  }

  /* ---------- QUANTITY ---------- */

  if (
    payload.quantity > location.maxQtyPerBooking ||
    payload.quantity > product.maxQuantity
  ) {
    errors.push(
      error(
        "quantity",
        `Max quantity allowed is ${Math.min(
          location.maxQtyPerBooking,
          product.maxQuantity,
        )}`,
      ),
    );
  }

  /* ---------- PAYMENT MODE ---------- */

  const paymentMode = location.paymentModes.find(
    (p) => p.paymentType === payload.paymentType,
  );

  if (!paymentMode) {
    errors.push(error("paymentType", "Selected payment type is not available"));
  }

  /* ---------- PICKUP OPTION ---------- */

  const pickupOption = location.deliveryOptions.find(
    (o) => o.type === payload.pickupType && o.enabled,
  );

  if (!pickupOption) {
    errors.push(
      error("pickupType", `${payload.pickupType} pickup not available`),
    );
  }

  /* ---------- DROP OPTION ---------- */

  const dropOption = location.dropOptions.find(
    (o) => o.type === payload.dropType && o.enabled,
  );

  if (!dropOption) {
    errors.push(error("dropType", `${payload.dropType} drop not available`));
  }

  /* ---------- PICKUP POINT ---------- */

  if (
    payload.pickupType === "self-pickup" &&
    !location.pickupDropPoints.some(
      (p) => p.name === payload.pickup && p.pickup,
    )
  ) {
    errors.push(error("pickup", "Invalid pickup point"));
  }

  /* ---------- DROP POINT ---------- */

  if (
    payload.dropType === "self-drop" &&
    !location.pickupDropPoints.some((p) => p.name === payload.drop && p.drop)
  ) {
    errors.push(error("drop", "Invalid drop point"));
  }

  return errors;
};

/* ------------------ MAIN EXPORT ------------------ */

const validate = (payload) => [
  ...validateRequired(payload),
  ...validateTypes(payload),
  ...validateEnums(payload),
  ...validateCustom(payload),
  ...validateConstraints(payload),
];

module.exports = {
  schema,
  validateRequired,
  validateTypes,
  validateEnums,
  validateCustom,
  validateConstraints,
  validate,
};
