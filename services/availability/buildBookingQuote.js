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
        sort_order: term.sort_order,
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
    thumbnail_url: plainProduct.thumbnail_url,
    bookingTemplate: sanitizeBookingTemplate(
      plainProduct.bookingTemplate,
    ),
    productType: sanitizeProductType(
      plainProduct.productType,
    ),
    terms: sanitizeTerms(plainProduct.terms),
  };
};

const buildBookingQuote = ({
  product,
  location,
  booking = {},
  pricing = {},
  availability = {},
}) => {
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

      max_bookable_per_booking: pricing.max_bookable_per_booking ?? 0
    },

    availability: {
      slots: availability.slots || [],

      selected_slot: availability.selected_slot || null,

      daily_pricing: availability.daily_pricing || [],

      inventory: availability.inventory || null,

      next_available_date: availability.next_available_date || null,
    },
  };
};

module.exports = buildBookingQuote;
