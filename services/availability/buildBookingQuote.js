// services/booking/buildBookingQuote.js

const toPlainObject = (value) => {
  if (!value) {
    return {};
  }

  return typeof value.toJSON === "function"
    ? value.toJSON()
    : value;
};

const sanitizeTerms = (terms = []) =>
  Array.isArray(terms)
    ? terms.map((term) => ({
        content: term.content,
        title: term.title,
        sort_order: term.sort_order,
      }))
    : [];

const sanitizeCancellationPolicies = (policies = []) =>
  Array.isArray(policies)
    ? policies.map((policy) => ({
        title: policy.title,
        content: policy.content,
        sort_order: policy.sort_order,
      }))
    : [];

const sanitizeFaqs = (faqs = []) =>
  Array.isArray(faqs)
    ? faqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        sort_order: faq.sort_order,
      }))
    : [];

const sanitizeBookingTemplate = (bookingTemplate) => {
  if (!bookingTemplate) {
    return null;
  }

  return {
    name: bookingTemplate.name,
    slug: bookingTemplate.slug,
    description: bookingTemplate.description,
    product_page_schema:
      bookingTemplate.product_page_schema,
    booking_page_schema:
      bookingTemplate.booking_page_schema,
    version: bookingTemplate.version,
  };
};

const sanitizeProductType = (productType) => {
  if (!productType) {
    return null;
  }

  const category = productType.category
    ? {
        name: productType.category.name,
        slug: productType.category.slug,
        featured: productType.category.featured,
      }
    : null;

  return {
    slug: productType.slug,
    category,
  };
};

const sanitizeProduct = (product) => {
  const plainProduct = toPlainObject(product);

  return {
    slug: plainProduct.slug,
    name: plainProduct.name,
    booking_mode: plainProduct.booking_mode,
    pricing_mode: plainProduct.pricing_mode,
    thumbnail_url: plainProduct.thumbnail_url,
    bookingTemplate: sanitizeBookingTemplate(
      plainProduct.bookingTemplate,
    ),
    productType: sanitizeProductType(
      plainProduct.productType,
    ),
    terms: sanitizeTerms(plainProduct.terms),
    faqs: sanitizeFaqs(plainProduct.faqs),
    cancellation_policies: sanitizeCancellationPolicies(
      plainProduct.cancellationPolicies,
    ),
    inclusions: sanitizeTerms(plainProduct.inclusions),
    highlights: sanitizeTerms(plainProduct.highlights),
    exclusions: sanitizeTerms(plainProduct.exclusions),
  };
};

const getSlotDisplayType = ({
  slots = [],
  selectedSlot = null,
}) => {
  const slotOptions = [
    ...(Array.isArray(slots) ? slots : []),
    selectedSlot,
  ].filter(Boolean);

  if (!slotOptions.length) {
    return null;
  }

  const explicitType = slotOptions.find(
    (slot) => slot.slot_type,
  )?.slot_type;

  if (explicitType) {
    return explicitType;
  }

  const hasTimedSlot = slotOptions.some(
    (slot) => slot.start_time && slot.end_time,
  );

  return hasTimedSlot ? "TIME" : "VARIANT";
};

const buildBookingQuote = ({
  product,
  location,
  booking = {},
  pricing = {},
  availability = {},
}) => {
  const slots = availability.slots || [];
  const selectedSlot =
    availability.selected_slot || null;

  return {
    product: sanitizeProduct(product),
    location: {
      slug: location.slug,
      name: location.name,
    },

    booking,

    pricing: {
      currency: pricing.currency || "INR",

      // FIXED | SLOT | KM_BASED
      pricing_type: pricing.pricing_type || null,

      unit_price: Number(pricing.unit_price || 0),

      quantity: Number(pricing.quantity || 1),

      subtotal: Number(pricing.subtotal || 0),

      discount: Number(pricing.discount || 0),

      tax: Number(pricing.tax || 0),

      grand_total: Number(pricing.grand_total || 0),

      max_bookable_per_booking: pricing.max_bookable_per_booking ?? 0,

      distance_km: pricing.distance_km ?? null,

      duration_minutes: pricing.duration_minutes ?? null,
    },

    availability: {
      slot_display_type: getSlotDisplayType({
        slots,
        selectedSlot,
      }),

      slots,

      selected_slot: selectedSlot,

      daily_pricing: availability.daily_pricing || [],

      inventory: availability.inventory || null,

      service_hours: availability.service_hours || null,

      next_available_date: availability.next_available_date || null,
    },
  };
};

module.exports = buildBookingQuote;
