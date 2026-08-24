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

  country: Joi.string().trim().allow("", null).optional(),
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

    return value;
  })
  .messages({
    "customer_details.phone.invalid":
      '"phone" must be valid for the supplied country_code.',
    "customer_details.alternate_phone.invalid":
      '"alternate_phone" must be valid for the supplied alternate_country_code.',
    "customer_details.alternate_country_code.required":
      '"alternate_country_code" is required when "alternate_phone" is provided.',
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

  acknowledged: Joi.boolean(),
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

const flight_details = Joi.object({
  airline: Joi.string().trim().required(),

  custom_airline: Joi.string()
    .trim()
    .allow("", null)
    .when("airline", {
      is: Joi.string().valid("other").insensitive(),
      then: Joi.string().trim().min(2).required(),
      otherwise: Joi.optional(),
    }),

  flight_number: Joi.string().trim().max(20).required(),
}).unknown(false);

const ferry_details = Joi.object({
  operator: Joi.string().trim().required(),

  custom_operator: Joi.string()
    .trim()
    .allow("", null)
    .when("operator", {
      is: Joi.string().valid("other", "others").insensitive(),
      then: Joi.string().trim().min(2).required(),
      otherwise: Joi.optional(),
    }),

  ferry_time: time24Hour.required(),
}).unknown(false);

const opt_for_pickup_and_drop = Joi.boolean();

const kycDocument = Joi.object({
  file_name: Joi.string().trim().required(),

  document_id: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required(),

  document_url: Joi.string().trim().min(1).required(),
}).unknown(false);

const kycPassenger = Joi.object({
  nationality: Joi.string().valid("Indian", "Foreigner").required(),

  id_proof_type: Joi.string()
    .when("nationality", {
      is: "Foreigner",
      then: Joi.string().valid("passport").required().messages({
        "any.only": "id_proof_type must be passport for non-Indian nationality.",
      }),
      otherwise: Joi.string()
        .valid("passport", "aadhaar_card", "voter_id", "driving_licence", "other")
        .required(),
    }),

  id_number: Joi.string().trim().required(),

  id_expiry_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .when("id_proof_type", {
      is: "passport",
      then: Joi.required(),
      otherwise: Joi.valid(null).optional(),
    }),

  document: kycDocument.required(),
}).unknown(false);

const kyc_per_passanger = Joi.array().items(kycPassenger).min(1).messages({
  "array.min": "Provide KYC details for every passenger.",
});

// Same shape as kyc_per_passanger, but not tied to an exact guest/quantity
// count - the section's own `config.max_entries` (see validateBookingPayload
// below) caps how many entries are allowed instead.
const kyc_upto_max = Joi.array().items(kycPassenger).min(0);

const infant_documents = Joi.object({
  has_infant: Joi.boolean().required(),

  documents: Joi.array()
    .items(kycDocument)
    .when("has_infant", {
      is: true,
      then: Joi.array().min(1).required(),
      otherwise: Joi.forbidden(),
    }),
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

  [BOOKING_SECTIONS.KYC_PER_PASSENGER]: kyc_per_passanger,

  [BOOKING_SECTIONS.KYC_UPTO_MAX]: kyc_upto_max,

  [BOOKING_SECTIONS.INFANT_DOCUMENTS]: infant_documents,

  [BOOKING_SECTIONS.FLIGHTDETAILS]: flight_details,

  [BOOKING_SECTIONS.FERRYDETAILS]: ferry_details,

  [BOOKING_SECTIONS.OPT_FOR_PICKUP_AND_DROP]: opt_for_pickup_and_drop,
};
const formatSectionValidationErrors = (section, details) => {
  const documentMessageBySection = {
    [BOOKING_SECTIONS.KYC_PER_PASSENGER]:
      "Upload a valid KYC document for every passenger.",
    [BOOKING_SECTIONS.INFANT_DOCUMENTS]:
      "Upload a valid document for the infant.",
  };
  const documentMessage = documentMessageBySection[section];

  if (!documentMessage) {
    return details.map((detail) => detail.message);
  }

  const messages = new Set();
  const isDocumentError = (detail) =>
    detail.path.some((pathPart) =>
      String(pathPart).toLowerCase().startsWith("document"),
    );
  const hasDocumentError = details.some(isDocumentError);

  for (const detail of details) {
    if (!isDocumentError(detail)) {
      messages.add(detail.message);
    }
  }

  if (hasDocumentError) {
    messages.add(documentMessage);
  }

  return [...messages];
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

      // Generic per-section entry cap - any section can opt in by setting
      // config.max_entries, independent of guests/quantity.
      const maxEntries = Number(section.config?.max_entries);

      if (
        Array.isArray(value) &&
        Number.isInteger(maxEntries) &&
        maxEntries > 0 &&
        value.length > maxEntries
      ) {
        errors.push({
          section: section.section,
          errors: [
            `${section.section} must not have more than ${maxEntries} entries.`,
          ],
        });
      }
    }

    if (error) {
      errors.push({
        section: section.section,
        errors: formatSectionValidationErrors(section.section, error.details),
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
