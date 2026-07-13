const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getVendorProductPrice = (
  vendorProduct,
  availableSlots = [],
) => {
  const basePrice = roundMoney(vendorProduct.base_price || 0);

  const slotPrices = availableSlots
    .map((slot) => Number(slot.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  const lowestSlotPrice = slotPrices.length
    ? roundMoney(Math.min(...slotPrices))
    : basePrice;

  return {
    base_price: basePrice,
    display_price: lowestSlotPrice,
    price_type: vendorProduct.pricing_type,
  };
};

module.exports = {
  getVendorProductPrice,
};
