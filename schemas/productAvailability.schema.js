const Joi = require("joi");
const {
  createTransferLocationValidation,
} = require("./transferLocation.schema");

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

  pickup_time: time24Hour.optional(),

  preferred_time: time24Hour.allow("", null).optional(),

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

  preferred_time: time24Hour.allow("", null).optional(),

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

const createAirportTransferAvailabilitySchema = ({ locations }) => {
  const {
    getConfiguredTransferLocation,
    getLocationPairError,
    transferLocationSchema,
  } = createTransferLocationValidation({ locations });

  return Joi.object({
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

  pickup_location: transferLocationSchema,

  drop_location: transferLocationSchema,

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

    const locationError = getLocationPairError(value);

    if (locationError) {
      return helpers.error(`airport_transfer.${locationError}`);
    }

    const pickupLocation = getConfiguredTransferLocation(
      value.pickup_location,
    );
    const dropLocation = getConfiguredTransferLocation(
      value.drop_location,
    );

    const pickupIsAirport = pickupLocation?.place_types?.includes("airport") ?? false;
    const dropIsAirport = dropLocation?.place_types?.includes("airport") ?? false;
    const invalidRoute =
      (value.transfer_type === "airport_to_location" &&
        (!pickupIsAirport || dropIsAirport)) ||
      (value.transfer_type === "location_to_airport" &&
        (pickupIsAirport || !dropIsAirport));

    if (invalidRoute) {
      return helpers.error("airport_transfer.invalid_route");
    }

    return value;
  })
  .messages({
    "airport_transfer.invalid_location":
      "Selected airport transfer location is invalid.",
    "airport_transfer.same_location":
      "Pickup and drop locations must be different.",
    "airport_transfer.invalid_route":
      "Pickup and drop locations do not match the selected transfer_type.",
  });
};

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
  createAirportTransferAvailabilitySchema,
  availableDatesQuerySchema,
};
