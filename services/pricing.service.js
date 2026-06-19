// services/pricing.service.js

const evaluateRule = (rule, contextValue) => {
  switch (rule.operator) {
    case "EQ":
      return contextValue == rule.value;

    case "NEQ":
      return contextValue != rule.value;

    case "GT":
      return Number(contextValue) > Number(rule.value);

    case "GTE":
      return Number(contextValue) >= Number(rule.value);

    case "LT":
      return Number(contextValue) < Number(rule.value);

    case "LTE":
      return Number(contextValue) <= Number(rule.value);

    case "IN":
      return Array.isArray(rule.value)
        ? rule.value.includes(contextValue)
        : false;

    case "NOT_IN":
      return Array.isArray(rule.value)
        ? !rule.value.includes(contextValue)
        : false;

    case "CONTAINS":
      return String(contextValue || "")
        .toLowerCase()
        .includes(
          String(rule.value || "").toLowerCase()
        );

    case "REGEX":
      return new RegExp(rule.value, "i").test(
        String(contextValue || "")
      );

    case "BETWEEN":
      if (
        !Array.isArray(rule.value) ||
        rule.value.length !== 2
      ) {
        return false;
      }

      return (
        contextValue >= rule.value[0] &&
        contextValue <= rule.value[1]
      );

    default:
      return false;
  }
};

const matches = (conditions, context) => {
  if (!conditions?.rules?.length) {
    return false;
  }

  const results = conditions.rules.map((rule) => {
    const contextValue = context[rule.field];

    return evaluateRule(rule, contextValue);
  });

  if (conditions.operator === "OR") {
    return results.some(Boolean);
  }

  return results.every(Boolean);
};

const applyAction = (price, action) => {
  switch (action.type) {
    case "FIXED_PRICE":
      return Number(action.value);

    case "PERCENTAGE":
      return (
        price +
        (price * Number(action.value)) / 100
      );

    case "AMOUNT":
      return price + Number(action.value);

    default:
      return price;
  }
};

const getPrice = ({
  pricing = {},
  context = {},
}) => {
  let finalPrice = Number(
    pricing.basePrice || 0
  );

  const overrides = Array.isArray(
    pricing.overrides
  )
    ? [...pricing.overrides]
    : [];

  const now = new Date();

  const activeOverrides = overrides
    .filter((rule) => {
      if (rule.enabled === false) {
        return false;
      }

      if (
        rule.valid_from &&
        new Date(rule.valid_from) > now
      ) {
        return false;
      }

      if (
        rule.valid_to &&
        new Date(rule.valid_to) < now
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        Number(b.priority || 0) -
        Number(a.priority || 0)
    );

  for (const rule of activeOverrides) {
    if (matches(rule.conditions, context)) {
      finalPrice = applyAction(
        finalPrice,
        rule.action
      );

      // highest priority wins
      break;
    }
  }

  return {
    currency: pricing.currency || "INR",
    basePrice: Number(pricing.basePrice || 0),
    finalPrice: Math.round(finalPrice),
  };
};

module.exports = {
  getPrice,
};