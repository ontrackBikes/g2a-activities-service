const bookingFields = require("../../constants/bookingFields");

/**
 * If the product's booking template declares a "derive_quantity" field,
 * returns quantity = ceil(guests / per_qty_guests) - the server-authoritative
 * value that overrides whatever quantity the client sent. Returns null when
 * the template doesn't declare the field (the vast majority of products),
 * meaning no override should happen.
 */
const resolveDerivedQuantity = ({ bookingTemplate, guests }) => {
  const fields = bookingTemplate?.product_page_schema?.fields;

  if (!Array.isArray(fields)) {
    return null;
  }

  const field = fields.find(
    (f) => f.field === bookingFields.DERIVE_QUANTITY,
  );

  if (!field) {
    return null;
  }

  const perQtyGuests = Number(field.config?.per_qty_guests);

  if (!perQtyGuests || perQtyGuests < 1) {
    return null;
  }

  const guestsCount = Number(guests);

  if (!guestsCount || guestsCount < 1) {
    return null;
  }

  return Math.ceil(guestsCount / perQtyGuests);
};

module.exports = { resolveDerivedQuantity };
