const Joi = require("joi");
const {
  parsePhoneNumberFromString,
} = require("libphonenumber-js");

const BOOKING_SECTIONS = require("../constants/bookingSections");
const bikeRentalLocations = require("../constants/bikeRentalLocations");
const VALID_PICKUP_POINT_SLUGS = bikeRentalLocations.map(
  (location) => location.slug,
);

const pickupPointSchema = Joi.object({
  slug: Joi.string()
    .valid(...VALID_PICKUP_POINT_SLUGS)
    .required(),

  address: Joi.string().trim().required(),
})
  .unknown(true)
  .custom((value, helpers) => {
    const location = bikeRentalLocations.find((x) => x.slug === value.slug);

    if (!location) {
      console.error("Invalid pickup point:", {
        path: helpers.state.path,
        value,
        validSlugs: VALID_PICKUP_POINT_SLUGS,
      });

      return helpers.error("any.invalid");
    }

    return location;
  })
  .messages({
    "any.invalid": "Invalid self pickup point for the selected location.",
  });

const time24Hour = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "pickup_time must be in HH:mm format",
  });

const isValidPhoneForCountryCode = ({
  countryCode,
  phone,
}) =>
  parsePhoneNumberFromString(
    `${countryCode}${phone}`,
  )?.isValid() === true;

/*
|--------------------------------------------------------------------------
| Section Schemas
|--------------------------------------------------------------------------
*/

const customer_details = Joi.object({
  first_name: Joi.string().trim().required(),

  last_name: Joi.string().trim().allow("", null),

  email: Joi.string().email().required(),

  country_code: Joi.string()
    .pattern(/^\+[1-9]\d{0,3}$/)
    .required(),

  phone: Joi.string()
    .pattern(/^\d{4,15}$/)
    .required(),

  alternate_phone: Joi.string()
    .pattern(/^\d{4,15}$/)
    .allow("", null)
    .optional(),

  alternate_country_code: Joi.string()
    .pattern(/^\+[1-9]\d{0,3}$/)
    .allow("", null)
    .optional(),

  country: Joi.string().trim().required(),
})
  .custom((value, helpers) => {
    if (
      !isValidPhoneForCountryCode({
        countryCode: value.country_code,
        phone: value.phone,
      })
    ) {
      return helpers.error("customer_details.phone.invalid");
    }

    if (
      value.alternate_phone &&
      !value.alternate_country_code
    ) {
      return helpers.error(
        "customer_details.alternate_country_code.required",
      );
    }

    if (
      value.alternate_phone &&
      !isValidPhoneForCountryCode({
        countryCode: value.alternate_country_code,
        phone: value.alternate_phone,
      })
    ) {
      return helpers.error("customer_details.alternate_phone.invalid");
    }

    if (
      !value.alternate_phone &&
      value.alternate_country_code
    ) {
      return helpers.error(
        "customer_details.alternate_country_code.forbidden",
      );
    }

    return value;
  })
  .messages({
    "customer_details.phone.invalid":
      '"phone" must be valid for the supplied country_code.',
    "customer_details.alternate_phone.invalid":
      '"alternate_phone" must be valid for the supplied alternate_country_code.',
    "customer_details.alternate_country_code.required":
      '"alternate_country_code" is required when "alternate_phone" is provided.',
    "customer_details.alternate_country_code.forbidden":
      '"alternate_country_code" is not allowed without "alternate_phone".',
  })
  .unknown(false);

const participant = Joi.object({
  first_name: Joi.string().required(),

  last_name: Joi.string().allow("", null),

  age: Joi.number().integer().min(1).required(),

  gender: Joi.string().required(),

  nationality: Joi.string().required(),

  weight: Joi.number().allow(null),

  height: Joi.number().allow(null),

  shoe_size: Joi.string().allow("", null),

  passport_number: Joi.string().allow("", null),

  id_number: Joi.string().allow("", null),

  seat_preference: Joi.string().allow("", null),

  seat_number: Joi.string().allow("", null),
}).unknown(false);

const participants = Joi.array().items(participant).min(1);

const emergency_contact = Joi.object({
  name: Joi.string().required(),

  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  relationship: Joi.string().required(),

  email: Joi.string().email().allow(""),
}).unknown(false);

const medical_declaration = Joi.object({
  asthma: Joi.boolean(),

  heart_disease: Joi.boolean(),

  epilepsy: Joi.boolean(),

  pregnant: Joi.boolean(),

  diabetes: Joi.boolean(),

  recent_surgery: Joi.boolean(),

  ear_problem: Joi.boolean(),

  other: Joi.boolean(),

  other_details: Joi.string().allow("").when("other", {
    is: true,
    then: Joi.required(),
  }),
}).unknown(false);

const rental_details = Joi.object({
  pickup_time: time24Hour.required(),

  pickup_type: Joi.string().valid("self", "hotel").required(),

  pickup_point: pickupPointSchema.when("pickup_type", {
    is: "self",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  pickup_hotel_name: Joi.string().trim().min(2).max(255).when("pickup_type", {
    is: "hotel",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  drop_type: Joi.string().valid("self", "hotel").required(),

  drop_point: pickupPointSchema.when("drop_type", {
    is: "self",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  drop_hotel_name: Joi.string().trim().min(2).max(255).when("drop_type", {
    is: "hotel",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  drop_time: Joi.forbidden().messages({
    "any.unknown":
      "drop_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),

  return_time: Joi.forbidden().messages({
    "any.unknown":
      "return_time is not allowed. Drop time is calculated automatically from pickup_time.",
  }),
}).unknown(false);

const ferry_seat_selection = Joi.object({
  travel_class: Joi.string().required(),
}).unknown(false);

/*
|--------------------------------------------------------------------------
| Registry
|--------------------------------------------------------------------------
*/

const SECTION_SCHEMAS = {
  [BOOKING_SECTIONS.CUSTOMER_DETAILS]: customer_details,

  [BOOKING_SECTIONS.PARTICIPANTS]: participants,

  [BOOKING_SECTIONS.EMERGENCY_CONTACT]: emergency_contact,

  [BOOKING_SECTIONS.MEDICAL_DECLARATION]: medical_declaration,

  [BOOKING_SECTIONS.RENTAL_DETAILS]: rental_details,

  [BOOKING_SECTIONS.FERRY_SEAT_SELECTION]: ferry_seat_selection,
};

/*
|--------------------------------------------------------------------------
| Validate Booking Payload
|--------------------------------------------------------------------------
*/

const validateBookingPayload = ({ bookingTemplate, payload }) => {
  const errors = [];

  for (const section of bookingTemplate.booking_page_schema.sections || []) {
    if (!section.enabled) {
      continue;
    }

    const schema = SECTION_SCHEMAS[section.section];

    if (!schema) {
      continue;
    }

    const sectionSchema = section.required ? schema.required() : schema;

    const { error, value } = sectionSchema.validate(payload[section.section], {
      abortEarly: false,
      stripUnknown: false,
    });

    if (!error) {
      payload[section.section] = value;
    }

    if (error) {
      console.log(JSON.stringify(error.details, null, 2));
      errors.push({
        section: section.section,
        errors: error.details.map((x) => x.message),
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateBookingPayload,
  SECTION_SCHEMAS,
};
