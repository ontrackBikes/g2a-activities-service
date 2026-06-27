const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getVendorProductPrice = (
  vendorProduct,
  availableSlots = [],
) => {
  const basePrice = roundMoney(vendorProduct.base_price || 0);

  if (vendorProduct.pricing_type !== "SLOT") {
    return {
      base_price: basePrice,
      display_price: basePrice,
      price_type: "flat",
    };
  }

  const slotPrices = availableSlots
    .map((slot) => Number(slot.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  const lowestSlotPrice = slotPrices.length
    ? roundMoney(Math.min(...slotPrices))
    : basePrice;

  return {
    base_price: basePrice,
    display_price: lowestSlotPrice,
    price_type: "starts_from",
  };
};

module.exports = {
  getVendorProductPrice,
};
