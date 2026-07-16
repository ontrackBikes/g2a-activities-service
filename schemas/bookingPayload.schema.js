const Joi = require("joi");

const BOOKING_SECTIONS = require("../constants/bookingSections");
const { bikeRentalLocations } = require("../data/productConfig");

const PICKUP_POINTS = [
  ...new Set(
    bikeRentalLocations.flatMap((location) =>
      (location.pickupDropPoints || [])
        .filter((point) => point.pickup || point.drop)
        .map((point) => point.name),
    ),
  ),
];

const time24Hour = Joi.string()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base":
      "pickup_time must be in HH:mm format",
  });

/*
|--------------------------------------------------------------------------
| Section Schemas
|--------------------------------------------------------------------------
*/

const customer_details = Joi.object({
  first_name: Joi.string().trim().required(),

  last_name: Joi.string().trim().allow("", null),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  country: Joi.string().required(),
}).unknown(false);

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

const participants = Joi.array()
  .items(participant)
  .min(1);

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

  other_details: Joi.string()
    .allow("")
    .when("other", {
      is: true,
      then: Joi.required(),
    }),
}).unknown(false);

const rental_details = Joi.object({
  pickup_time: time24Hour.required(),

  pickup_type: Joi.string().valid("self", "hotel").required(),

  pickup_point: Joi.string()
    .valid(...PICKUP_POINTS)
    .when("pickup_type", {
      is: "self",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  pickup_hotel_name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .when("pickup_type", {
      is: "hotel",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  drop_type: Joi.string().valid("self", "hotel").required(),

  drop_point: Joi.string()
    .valid(...PICKUP_POINTS)
    .when("drop_type", {
      is: "self",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

  drop_hotel_name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .when("drop_type", {
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

  [BOOKING_SECTIONS.MEDICAL_DECLARATION]:
    medical_declaration,

  [BOOKING_SECTIONS.RENTAL_DETAILS]:
    rental_details,

  [BOOKING_SECTIONS.FERRY_SEAT_SELECTION]:
    ferry_seat_selection,
};

/*
|--------------------------------------------------------------------------
| Validate Booking Payload
|--------------------------------------------------------------------------
*/

const validateBookingPayload = ({
  bookingTemplate,
  payload,
}) => {
  const errors = [];

  for (const section of bookingTemplate.booking_page_schema.sections || []) {
    if (!section.enabled) {
      continue;
    }

    const schema =
      SECTION_SCHEMAS[section.section];

    if (!schema) {
      continue;
    }

    const sectionSchema = section.required ? schema.required() : schema;
    const { error } = sectionSchema.validate(
      payload[section.section],
      {
        abortEarly: false,
      },
    );

    if (error) {
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
