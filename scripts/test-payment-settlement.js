require("dotenv").config();

const {
  settlePayment,
} = require("../services/paymentSettlement.service");

const paymentId = process.argv[2];

if (!paymentId) {
  console.error(
    "Usage: node scripts/test-payment-settlement.js <paymentId>"
  );

  process.exit(1);
}

(async () => {
  try {
    const result = await settlePayment({
      paymentId,
    });

    console.log(
      "\nSettlement Result:"
    );

    console.dir(result, {
      depth: null,
    });

    process.exit(0);
  } catch (error) {
    console.error(
      "\nSettlement Failed:"
    );

    console.error(error);

    process.exit(1);
  }
})();