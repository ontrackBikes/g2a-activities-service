const { bikeRentalLocations } = require("../data/productConfig");

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
    validate: (v) => /^\d{10}$/.test(v) || "mobile must be 10 digits",
  },

  "customer.email": {
    required: true,
    type: "string",
    validate: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "email must be valid",
  },
};

const getValue = (obj, path) =>
  path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

const error = (field, message) => ({ field, message });

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
        error(field, `${field} must be one of ${rule.enum.join(", ")}`)
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

const validateConstraints = (payload) => {
  const errors = [];

  const location = bikeRentalLocations.find(
    (l) => l.name.toLowerCase() === payload.locationName?.toLowerCase()
  );

  if (!location) {
    errors.push(error("locationName", "Location does not exist"));
    return errors;
  }

  if (payload.quantity > location.maxQtyPerBooking) {
    errors.push(
      error("quantity", `Max quantity allowed is ${location.maxQtyPerBooking}`)
    );
  }

  if (
    payload.pickupType === "self-pickup" &&
    !location.pickupDropPoints.some((p) => p.name === payload.pickup)
  ) {
    errors.push(error("pickup", "Invalid pickup point"));
  }

  if (
    payload.dropType === "self-drop" &&
    !location.pickupDropPoints.some((p) => p.name === payload.drop)
  ) {
    errors.push(error("drop", "Invalid drop point"));
  }

  if (payload.pickupType === "hotel" && !location.hotelDelivery?.enabled) {
    errors.push(
      error("pickupType", "Hotel pickup not available at this location")
    );
  }

  if (payload.dropType === "hotel" && !location.hotelPickup?.enabled) {
    errors.push(error("dropType", "Hotel drop not available at this location"));
  }

  return errors;
};

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
