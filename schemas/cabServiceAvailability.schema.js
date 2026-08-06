const Joi = require("joi");
const {
  createTransferLocationValidation,
} = require("./transferLocation.schema");

const time24Hour = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "pickup_time must be in HH:mm format",
  });

const estimateId = Joi.string()
  .guid({ version: ["uuidv4", "uuidv5"] })
  .optional();

const slotToken = Joi.string()
  .pattern(/^slot_[a-f0-9]{16}$/)
  .allow(null, "")
  .messages({
    "string.pattern.base": "Invalid slot token.",
  })
  .optional();

const createCabServiceAvailabilitySchema = ({ locations }) => {
  const {
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
    pickup_location: transferLocationSchema,
    drop_location: transferLocationSchema,
    pickup_time: time24Hour.default("10:00"),
    estimate_id: estimateId,
    selected_slot_token: slotToken,
  })
    .custom((value, helpers) => {
      const locationError = getLocationPairError(value);

      return locationError
        ? helpers.error(`cab_service.${locationError}`)
        : value;
    })
    .messages({
      "cab_service.invalid_location":
        "Selected cab service location is invalid.",
      "cab_service.same_location":
        "Pickup and drop locations must be different.",
    });
};

module.exports = { createCabServiceAvailabilitySchema };
