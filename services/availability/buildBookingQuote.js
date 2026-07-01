// services/booking/buildBookingQuote.js

const buildBookingQuote = ({
  product,
  location,
  booking = {},
  pricing = {},
  availability = {},
}) => {
  return {
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      booking_mode: product.booking_mode,
    },

    location: {
      id: location.id,
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
    },

    availability: {
      vendor_product_id:
        availability.vendor_product_id || null,

      slots: availability.slots || [],

      daily_pricing:
        availability.daily_pricing || [],

      inventory:
        availability.inventory || null,

      next_available_date:
        availability.next_available_date || null,
    },
  };
};

module.exports = buildBookingQuote;