const Joi = require("joi");

const resendEmailSchema = Joi.object({
  to: Joi.string().trim().email().allow(null),
  cc: Joi.string().trim().email().allow(null, ""),
  bcc: Joi.string().trim().email().allow(null, ""),
});

module.exports = {
  resendEmailSchema,
};
