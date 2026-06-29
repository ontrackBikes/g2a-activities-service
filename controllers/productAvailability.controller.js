const moment = require("moment-timezone");

const {
  Product,
  ProductType,
  Location,
} = require("../models");
const {
  checkProductAvailabilitySchema,
  checkBikeRentalAvailabilitySchema,
} = require(
  "../schemas/productAvailability.schema"
);
const {
  getAvailableVendorForProduct,
} = require(
  "../services/availableVendor.service"
);
const {
  BikeRentalAvailabilityError,
  getAvailableBikeRentalVendor,
} = require(
  "../services/bikeRentalAvailability.service"
);

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

const checkProductAvailability = async (
  req,
  res,
) => {
  try {
    const product = await Product.findOne({
      attributes: ["id", "slug", "name"],
      where: {
        slug: req.params.slug,
        active: true,
      },
      include: [
        {
          model: ProductType,
          as: "productType",
          attributes: ["slug"],
          required: true,
          where: {
            active: true,
          },
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const isBikeRental =
      product.productType.slug ===
      "bike-rentals";
    const validationSchema = isBikeRental
      ? checkBikeRentalAvailabilitySchema
      : checkProductAvailabilitySchema;
    const { error, value } =
      validationSchema.validate(
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

    if (isBikeRental) {
      const rentalAvailability =
        await getAvailableBikeRentalVendor({
          productId: product.id,
          locationId: location.id,
          startDate: value.start_date,
          endDate: value.end_date,
          quantity: value.quantity,
        });

      if (!rentalAvailability) {
        return res.status(200).json({
          success: true,
          available: false,
          message:
            "Bike rental is not available for the selected location, dates and quantity",
          data: {
            product_slug: product.slug,
            location: {
              name: location.name,
              slug: location.slug,
            },
            start_date: value.start_date,
            end_date: value.end_date,
            quantity: value.quantity,
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
          start_date:
            rentalAvailability.start_date,
          end_date:
            rentalAvailability.end_date,
          rental_days:
            rentalAvailability.rental_days,
          quantity:
            rentalAvailability.quantity,
          price_type: "flat",
          price_per_bike:
            rentalAvailability.unit_price_total,
          rental_total:
            rentalAvailability.rental_total,
          daily_pricing:
            rentalAvailability.daily_pricing.map(
              (item) => ({
                date: item.date,
                unit_price: item.unit_price,
              }),
            ),
        },
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
    if (
      error instanceof
      BikeRentalAvailabilityError
    ) {
      return res
        .status(error.statusCode)
        .json({
          success: false,
          message: error.message,
          code: error.code,
        });
    }

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
