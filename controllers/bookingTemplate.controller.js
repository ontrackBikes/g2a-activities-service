const { Op } = require("sequelize");


const {
  createBookingTemplateSchema,
  updateBookingTemplateSchema,
} = require("../schemas/bookingTemplate.schema.js");

const bookingFields = require("../constants/bookingFields");
const bookingSections = require("../constants/bookingSections");
const { BookingTemplate } = require("../models");

/**
 * ----------------------------------------
 * Helpers
 * ----------------------------------------
 */

const allowedFields = Object.values(bookingFields);
const allowedSections = Object.values(bookingSections);

const validateSchema = (
  productPageSchema,
  bookingPageSchema,
) => {
  if (
    productPageSchema?.fields &&
    Array.isArray(productPageSchema.fields)
  ) {
    for (const field of productPageSchema.fields) {
      if (!allowedFields.includes(field.field)) {
        throw new Error(
          `Unknown booking field '${field.field}'`,
        );
      }
    }
  }

  if (
    bookingPageSchema?.sections &&
    Array.isArray(bookingPageSchema.sections)
  ) {
    for (const section of bookingPageSchema.sections) {
      if (
        !allowedSections.includes(section.section)
      ) {
        throw new Error(
          `Unknown booking section '${section.section}'`,
        );
      }
    }
  }
};

/**
 * ----------------------------------------
 * Create
 * ----------------------------------------
 */

const createBookingTemplate = async (
  req,
  res,
) => {
  try {
    const { error, value } =
      createBookingTemplateSchema.validate(
        req.body,
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    validateSchema(
      value.product_page_schema,
      value.booking_page_schema,
    );

    const existing =
      await BookingTemplate.findOne({
        where: {
          slug: value.slug,
        },
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "Booking template slug already exists.",
      });
    }

    const bookingTemplate =
      await BookingTemplate.create(value);

    return res.status(201).json({
      success: true,
      message:
        "Booking template created successfully.",
      data: bookingTemplate,
    });
  } catch (err) {
    console.error(
      "[BookingTemplate] create",
      err,
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ----------------------------------------
 * List
 * ----------------------------------------
 */

const getBookingTemplates = async (
  req,
  res,
) => {
  try {
    const {
      active,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const where = {};

    if (active !== undefined) {
      where.active = active === "true";
    }

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },
        {
          slug: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const offset =
      (Number(page) - 1) * Number(limit);

    const { rows, count } =
      await BookingTemplate.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [
          ["active", "DESC"],
          ["name", "ASC"],
        ],
      });

    return res.json({
      success: true,
      count,
      page: Number(page),
      limit: Number(limit),
      data: rows,
    });
  } catch (err) {
    console.error(
      "[BookingTemplate] list",
      err,
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ----------------------------------------
 * Get One
 * ----------------------------------------
 */

const getBookingTemplate = async (
  req,
  res,
) => {
  try {
    const bookingTemplate =
      await BookingTemplate.findByPk(
        req.params.id,
      );

    if (!bookingTemplate) {
      return res.status(404).json({
        success: false,
        message:
          "Booking template not found.",
      });
    }

    return res.json({
      success: true,
      data: bookingTemplate,
    });
  } catch (err) {
    console.error(
      "[BookingTemplate] get",
      err,
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ----------------------------------------
 * Update
 * ----------------------------------------
 */

const updateBookingTemplate = async (
  req,
  res,
) => {
  try {
    const { error, value } =
      updateBookingTemplateSchema.validate(
        req.body,
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const bookingTemplate =
      await BookingTemplate.findByPk(
        req.params.id,
      );

    if (!bookingTemplate) {
      return res.status(404).json({
        success: false,
        message:
          "Booking template not found.",
      });
    }

    if (
      value.product_page_schema ||
      value.booking_page_schema
    ) {
      validateSchema(
        value.product_page_schema ||
          bookingTemplate.product_page_schema,
        value.booking_page_schema ||
          bookingTemplate.booking_page_schema,
      );
    }

    if (value.slug) {
      const duplicate =
        await BookingTemplate.findOne({
          where: {
            slug: value.slug,
            id: {
              [Op.ne]:
                bookingTemplate.id,
            },
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Slug already exists.",
        });
      }
    }

    await bookingTemplate.update(value);

    return res.json({
      success: true,
      message:
        "Booking template updated successfully.",
      data: bookingTemplate,
    });
  } catch (err) {
    console.error(
      "[BookingTemplate] update",
      err,
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ----------------------------------------
 * Delete (Soft Delete)
 * ----------------------------------------
 */

const deleteBookingTemplate = async (
  req,
  res,
) => {
  try {
    const bookingTemplate =
      await BookingTemplate.findByPk(
        req.params.id,
      );

    if (!bookingTemplate) {
      return res.status(404).json({
        success: false,
        message:
          "Booking template not found.",
      });
    }

    await bookingTemplate.update({
      active: false,
    });

    return res.json({
      success: true,
      message:
        "Booking template archived successfully.",
    });
  } catch (err) {
    console.error(
      "[BookingTemplate] delete",
      err,
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * ----------------------------------------
 * Registry
 * ----------------------------------------
 */

const getBookingRegistry = async (
  req,
  res,
) => {
  return res.json({
    success: true,
    data: {
      fields: bookingFields,
      sections: bookingSections,
    },
  });
};

module.exports = {
  createBookingTemplate,
  getBookingTemplates,
  getBookingTemplate,
  updateBookingTemplate,
  deleteBookingTemplate,
  getBookingRegistry,
};