const Joi = require("joi");
const { MEDIA_FOLDERS } = require("../config/media.config");

const createMediaSchema = Joi.object({
  folder: Joi.string()
    .valid(...MEDIA_FOLDERS)
    .required(),

  entity_type: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

});

const updateMediaSchema = Joi.object({
  active: Joi.boolean(),
  entity_type: Joi.string().trim().min(2).max(100),
}).min(1);

module.exports = {
  createMediaSchema,
  updateMediaSchema,
};