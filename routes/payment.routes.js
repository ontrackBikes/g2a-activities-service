const express = require("express");
const router = express.Router();
const { resendEmail } = require("../controllers/payment.controller");
const { validateUser } = require("../middlewares/auth.middleware");

router.post("/:payment_id/resend-email", validateUser, resendEmail);

module.exports = router;
