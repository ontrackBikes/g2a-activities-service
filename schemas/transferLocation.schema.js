const Joi = require("joi");

const { verifyCoordinateSignature } = require("../services/googleMaps.service");

const customTransferLocationSchema = Joi.object({
  type: Joi.string().valid("custom").required(),
  name: Joi.string().trim().min(1).max(150).required(),
  address: Joi.string().trim().min(1).max(500).required(),
  lat: Joi.number().min(-90).max(90),
  lng: Joi.number().min(-180).max(180),
  signature: Joi.string().trim().max(128),
  place_types: Joi.array().items(Joi.string().trim().max(50)).max(20),
})
  .unknown(false)
  .and("lat", "lng", "signature")
  .custom((value, helpers) => {
    if (value.lat == null) {
      return value;
    }

    if (!verifyCoordinateSignature(value.lat, value.lng, value.signature)) {
      return helpers.error("location.invalid_signature");
    }

    return value;
  })
  .messages({
    "location.invalid_signature":
      "Pickup/drop location could not be verified. Please re-select it from search results.",
  });

const getLocationKey = (location) => {
  if (Number.isInteger(location)) {
    return `configured:${location}`;
  }

  if (location?.type === "custom") {
    return [
      "custom",
      location.name.trim().toLowerCase(),
      location.address.trim().toLowerCase(),
    ].join(":");
  }

  return null;
};

const createTransferLocationValidation = ({ locations, allowCustom = true }) => {
  const getConfiguredTransferLocation = (location) =>
    Number.isInteger(location)
      ? locations.find(({ id }) => id === location) || null
      : null;

  const transferLocationSchema = Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      ...(allowCustom ? [customTransferLocationSchema] : []),
    )
    .allow(null)
    .default(null);

  const getLocationPairError = ({ pickup_location, drop_location }) => {
    if (pickup_location == null || drop_location == null) {
      return null;
    }

    if (
      (Number.isInteger(pickup_location) &&
        !getConfiguredTransferLocation(pickup_location)) ||
      (Number.isInteger(drop_location) &&
        !getConfiguredTransferLocation(drop_location))
    ) {
      return "invalid_location";
    }

    return getLocationKey(pickup_location) === getLocationKey(drop_location)
      ? "same_location"
      : null;
  };

  return {
    getConfiguredTransferLocation,
    getLocationPairError,
    transferLocationSchema,
  };
};

module.exports = {
  createTransferLocationValidation,
};
