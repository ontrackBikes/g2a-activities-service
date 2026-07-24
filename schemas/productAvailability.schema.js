const Joi = require("joi");
const airportTransferLocations = require("../constants/airportTransferLocations");

const estimateId = Joi.string()
  .guid({
    version: ["uuidv4", "uuidv5"],
  })
  .optional();

const slotToken = Joi.string()
  .pattern(/^slot_[a-f0-9]{16}$/)
  .allow(null, "")
  .messages({
    "string.pattern.base": "Invalid slot token.",
  })
  .optional();

const time24Hour = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "pickup_time must be in HH:mm format",
  });

const checkSingleDateAvailabilitySchema = Joi.object({
  location_slug: Joi.string().trim().lowercase().max(100).required(),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "date must be in YYYY-MM-DD format",
    }),

  guests: Joi.number().integer().min(1).default(1),

  quantity: Joi.number().integer().min(1),

  estimate_id: estimateId,

  selected_slot_token: slotToken,
});

const checkDateRangeAvailabilitySchema = Joi.object({
  location_slug: Joi.string().trim().lowercase().max(100).required(),

  pickup_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "pickup_date must be in YYYY-MM-DD format",
    }),

  return_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "return_date must be in YYYY-MM-DD format",
    }),

  pickup_time: time24Hour.default("10:00"),

  drop_time: Joi.forbidden().messages({
    "any.unknown":
      "drop_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),

  return_time: Joi.forbidden().messages({
    "any.unknown":
      "return_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),

  guests: Joi.number().integer().min(1).default(1),

  quantity: Joi.number().integer().min(1),

  estimate_id: estimateId,

  selected_slot_token: slotToken,
});

const checkAirportTransferAvailabilitySchema = Joi.object({
  location_slug: Joi.string().trim().lowercase().max(100).required(),

  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "date must be in YYYY-MM-DD format",
    }),

  guests: Joi.number().integer().min(1).default(1),

  quantity: Joi.number().integer().min(1).required(),

  // These start out unset on first page load (before the user has picked a
  // direction/location), so they can't be `.required()` - the availability
  // check needs to succeed and render the form first. `checkAirportTransfer`
  // returns a "please make a selection" response when they're missing.
  transfer_type: Joi.string()
    .valid("airport_to_location", "location_to_airport")
    .default("airport_to_location"),

  pickup_location: Joi.number().integer().positive().allow(null).default(null),

  drop_location: Joi.number().integer().positive().allow(null).default(null),

  pickup_time: time24Hour.default("10:00"),

  estimate_id: estimateId,

  selected_slot_token: slotToken,
})
  .custom((value, helpers) => {
    // Locations haven't been picked yet (e.g. the initial availability
    // check on page load) - nothing to validate against each other yet.
    // `checkAirportTransfer` handles this "incomplete selection" case.
    if (value.pickup_location == null || value.drop_location == null) {
      return value;
    }

    const pickupLocation = airportTransferLocations.find(
      ({ id }) => id === value.pickup_location,
    );
    const dropLocation = airportTransferLocations.find(
      ({ id }) => id === value.drop_location,
    );

    if (!pickupLocation || !dropLocation) {
      return helpers.error("airport_transfer.invalid_location");
    }

    if (pickupLocation.id === dropLocation.id) {
      return helpers.error("airport_transfer.same_location");
    }

    const invalidRoute =
      (value.transfer_type === "airport_to_location" &&
        (pickupLocation.type !== "airport" ||
          dropLocation.type === "airport")) ||
      (value.transfer_type === "location_to_airport" &&
        (pickupLocation.type === "airport" || dropLocation.type !== "airport"));

    if (invalidRoute) {
      return helpers.error("airport_transfer.invalid_route");
    }

    return value;
  })
  .messages({
    "airport_transfer.invalid_location":
      "Pickup and drop locations must be valid airport transfer locations.",
    "airport_transfer.same_location":
      "Pickup and drop locations must be different.",
    "airport_transfer.invalid_route":
      "Pickup and drop locations do not match the selected transfer_type.",
  });

const checkOpenAvailabilitySchema = Joi.object({
  location_slug: Joi.string().trim().lowercase().max(100).required(),

  guests: Joi.number().integer().min(1).required(),

  estimate_id: estimateId,
});

const availableDatesQuerySchema = Joi.object({
  location_slug: Joi.string().trim().lowercase().max(100),

  from_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({
      "string.pattern.base": "from_date must be in YYYY-MM-DD format",
    }),

  to_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({
      "string.pattern.base": "to_date must be in YYYY-MM-DD format",
    }),

  guests: Joi.number().integer().min(1).max(100).default(1),

  quantity: Joi.number().integer().min(1).max(100),
});

module.exports = {
  checkSingleDateAvailabilitySchema,
  checkDateRangeAvailabilitySchema,
  checkAirportTransferAvailabilitySchema,
  checkOpenAvailabilitySchema,
  availableDatesQuerySchema,
};
