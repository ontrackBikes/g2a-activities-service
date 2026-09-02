const Joi = require("joi");

const BOOKING_SECTIONS = require("../constants/bookingSections");
const BOOKING_FIELDS = require("../constants/bookingFields");

const fieldSchema = Joi.object({
  field: Joi.string().required(),

  label: Joi.string().allow("", null),

  description: Joi.string().trim().max(500).allow("", null),

  required: Joi.boolean().default(false),

  hidden: Joi.boolean().default(false),

  readonly: Joi.boolean().default(false),

  default_value: Joi.any(),

  // "derive_quantity" replaces separate guests/quantity fields on the
  // product page with a single guest-count control - the frontend derives
  // quantity = ceil(guests / per_qty_guests), and the backend independently
  // recomputes/overrides it the same way at availability-check time rather
  // than trusting the client-sent quantity (see deriveQuantity.service.js).
  // unit_label (e.g. "car", "ferry") and per_qty_description are display-only
  // copy describing what one derived unit is - the backend never reads them,
  // it just stores/echoes them for the frontend to render.
  config: Joi.object().when("field", {
    is: BOOKING_FIELDS.DERIVE_QUANTITY,
    then: Joi.object({
      per_qty_guests: Joi.number().integer().min(1).required(),
      unit_label: Joi.string().trim().max(50).allow("", null),
      per_qty_description: Joi.string().trim().max(500).allow("", null),
    })
      .unknown(true)
      .required(),
    otherwise: Joi.object().default({}),
  }),

  visible: Joi.boolean().default(true),
});

const sectionSchema = Joi.object({
  section: Joi.string().required(),

  title: Joi.string().allow("", null),

  required: Joi.boolean().default(false),
  enabled: Joi.boolean().default(false),

  // "agree_to" is the one section that can be added to a template more than
  // once (one entry per checkbox), so each instance carries its own key
  // (used to namespace it in the booking payload/quote), its own short
  // checkbox label (agree_text), and its own full agreement copy
  // (description - rich text/HTML, rendered as-is by the frontend).
  config: Joi.object().when("section", {
    is: BOOKING_SECTIONS.AGREE_TO,
    then: Joi.object({
      key: Joi.string().trim().lowercase().max(100).required(),
      agree_text: Joi.string().trim().max(300).required(),
      description: Joi.string().trim().max(20000).required(),
    })
      .unknown(true)
      .required(),
    otherwise: Joi.object().default({}),
  }),

  sort_order: Joi.number(),
});

const sectionsCustomValidator = (sections, helpers) => {
  const agreeToKeys = sections
    .filter((section) => section.section === BOOKING_SECTIONS.AGREE_TO)
    .map((section) => section.config?.key);

  const duplicateKey = agreeToKeys.find(
    (key, index) => agreeToKeys.indexOf(key) !== index,
  );

  if (duplicateKey) {
    return helpers.message(
      `"agree_to" sections must each have a unique config.key (duplicate: "${duplicateKey}").`,
    );
  }

  return sections;
};

const createBookingTemplateSchema = Joi.object({
  name: Joi.string().max(150).required(),

  slug: Joi.string().lowercase().trim().max(150).required(),

  description: Joi.string().allow("", null),

  availability_handler: Joi.string()
    .valid("standard", "airport_transfer", "cab_service")
    .default("standard"),

  product_page_schema: Joi.object({
    fields: Joi.array().items(fieldSchema).default([]),
  }).required(),

  booking_page_schema: Joi.object({
    sections: Joi.array()
      .items(sectionSchema)
      .default([])
      .custom(sectionsCustomValidator),
  }).required(),

  active: Joi.boolean().default(true),
});

const updateBookingTemplateSchema = Joi.object({
  name: Joi.string().max(150),

  slug: Joi.string().lowercase().trim().max(150),

  description: Joi.string().allow("", null),

  availability_handler: Joi.string().valid(
    "standard",
    "airport_transfer",
    "cab_service",
  ),

  product_page_schema: Joi.object({
    fields: Joi.array().items(fieldSchema),
  }),

  booking_page_schema: Joi.object({
    sections: Joi.array()
      .items(sectionSchema)
      .custom(sectionsCustomValidator),
  }),

  active: Joi.boolean(),
}).min(1);

module.exports = {
  createBookingTemplateSchema,
  updateBookingTemplateSchema,
};
