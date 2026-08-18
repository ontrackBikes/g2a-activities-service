const Joi = require("joi");

const createDocumentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),

  entity_type: Joi.string().trim().min(2).max(100).optional(),

  entity_id: Joi.number().integer().positive().optional(),

  // Leave empty/null to keep the document forever.
  expires_at: Joi.date().iso().greater("now").optional().allow(null),
});

module.exports = {
  createDocumentSchema,
};
