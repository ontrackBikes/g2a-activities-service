const moment = require("moment-timezone");

const {
  Product,
  Location,
} = require("../models");
const {
  checkProductAvailabilitySchema,
} = require(
  "../schemas/productAvailability.schema"
);
const {
  getAvailableVendorForProduct,
} = require(
  "../services/availableVendor.service"
);

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const checkProductAvailability = async (
  req,
  res,
) => {
  try {
    const { error, value } =
      checkProductAvailabilitySchema.validate(
        req.body,
        {
          abortEarly: true,
          stripUnknown: true,
        },
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const today = moment()
      .tz(APP_TIMEZONE)
      .format("YYYY-MM-DD");

    if (
      !moment(
        value.date,
        "YYYY-MM-DD",
        true,
      ).isValid()
    ) {
      return res.status(400).json({
        success: false,
        message: "date must be a valid calendar date",
      });
    }

    if (value.date < today) {
      return res.status(400).json({
        success: false,
        message: "date cannot be in the past",
      });
    }

    const product = await Product.findOne({
      attributes: ["id", "slug", "name"],
      where: {
        slug: req.params.slug,
        active: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const location = await Location.findOne({
      attributes: ["id", "name", "slug"],
      where: {
        slug: value.location_slug,
        active: true,
      },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const availability =
      await getAvailableVendorForProduct({
        productId: product.id,
        locationId: location.id,
        date: value.date,
        pax: value.pax,
      });

    if (!availability) {
      return res.status(200).json({
        success: true,
        available: false,
        message:
          "Product is not available for the selected date, location and pax",
        data: {
          product_slug: product.slug,
          location: {
            name: location.name,
            slug: location.slug,
          },
          date: value.date,
          pax: value.pax,
        },
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        product_slug: product.slug,
        location: {
          name: location.name,
          slug: location.slug,
        },
        date: value.date,
        pax: value.pax,
        base_price:
          availability.pricing.base_price,
        display_price:
          availability.pricing.display_price,
        price_type:
          availability.pricing.price_type,
        slots: availability.slots.map(
          (slot) => ({
            name: slot.slot_name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            price: Number(slot.price),
            available: slot.available,
          }),
        ),
      },
    });
  } catch (error) {
    console.error(
      "[ProductAvailabilityController] checkProductAvailability",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to check product availability",
    });
  }
};

module.exports = {
  checkProductAvailability,
};
