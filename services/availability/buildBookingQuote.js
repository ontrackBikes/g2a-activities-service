// services/booking/buildBookingQuote.js

const buildBookingQuote = ({
  product,
  location,
  booking = {},
  pricing = {},
  availability = {},
}) => {
  delete product.id;
  return {
    // product: {

    //   slug: product.slug,
    //   name: product.name,
    //   booking_mode: product.booking_mode,
    //   thumbnail_url: product.thumbnail_url,
    // },
    product,
    location: {
      // id: location.id,
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
      slots: availability.slots || [],

      selected_slot: availability.selected_slot || null,

      daily_pricing: availability.daily_pricing || [],

      inventory: availability.inventory || null,

      next_available_date: availability.next_available_date || null,
    },
  };
};

module.exports = buildBookingQuote;
