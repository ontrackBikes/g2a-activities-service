const Joi = require("joi");

const customTransferLocationSchema = Joi.object({
  type: Joi.string().valid("custom").required(),
  name: Joi.string().trim().min(1).max(150).required(),
  address: Joi.string().trim().min(1).max(500).required(),
  lat: Joi.number().min(-90).max(90),
  lng: Joi.number().min(-180).max(180),
}).unknown(false);

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
