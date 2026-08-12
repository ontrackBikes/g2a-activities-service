const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getVendorProductPrice = (
  vendorProduct,
  availableSlots = [],
  distanceTierPrices = [],
) => {
  const basePrice = roundMoney(vendorProduct.base_price || 0);

  const slotPrices = availableSlots
    .map((slot) => Number(slot.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  const lowestSlotPrice = slotPrices.length
    ? roundMoney(Math.min(...slotPrices))
    : basePrice;

  // KM_BASED distance tiers can be cheaper than the default
  // slot/base price (e.g. a long-distance discount tier), so
  // the "starting from" price must consider them too.
  const tierPrices = distanceTierPrices
    .map((price) => Number(price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  const displayPrice = tierPrices.length
    ? roundMoney(Math.min(lowestSlotPrice, ...tierPrices))
    : lowestSlotPrice;

  return {
    base_price: basePrice,
    display_price: displayPrice,
    price_type: vendorProduct.pricing_type,
  };
};

module.exports = {
  getVendorProductPrice,
};
