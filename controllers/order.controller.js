const { validate } = require("../schemas/bikeRentalsOrder.schema");
const googleSheetService = require("../services/googleSheet.service");
const bikeRentalService = require("../services/bikeRentals.service");
const razorpayService = require("../services/razorpay.service");
const {
  sendPaymentPendingEmail,
} = require("../services/paymentSettlement.service");
const BookingEstimate = require("../models/bookingEstimate.model");
const { Op } = require("sequelize");
const { parsePhoneNumberFromString } = require("libphonenumber-js");

const {
  Product,
  BookingTemplate,
  Order,
  OrderItem,
  OrderParticipant,
  Customer,
  Payment,
  VendorScheduleSlot,
  Document,
} = require("../models");

const { validateBookingPayload } = require("../schemas/bookingPayload.schema");
const BOOKING_SECTIONS = require("../constants/bookingSections");
const sequelize = require("../config/sequelize");

const parsePositiveInteger = (value, defaultValue, maxValue = null) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
};

const verifyKycDocumentOwnership = async ({
  passengers,
  estimateId,
  sectionName,
  transaction,
}) => {
  const documentIds = passengers
    .map((passenger) => passenger.document?.document_id)
    .filter((id) => id !== null && id !== undefined);

  if (!documentIds.length) {
    return;
  }

  const documents = await Document.findAll({
    where: {
      id: documentIds,
      entity_type: "estimate",
      entity_id: estimateId,
      status: "active",
    },
    transaction,
  });

  if (documents.length !== new Set(documentIds).size) {
    throw {
      status: 422,
      message: "Validation failed.",
      errors: [
        {
          section: sectionName,
          errors: [
            "One or more KYC documents are invalid or do not belong to this estimate.",
          ],
        },
      ],
    };
  }
};

const buildDateRangeFilter = ({ dateFrom, dateTo }) => {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const range = {};

  if (dateFrom) {
    const from = new Date(dateFrom);

    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      range[Op.gte] = from;
    }
  }

  if (dateTo) {
    const to = new Date(dateTo);

    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      range[Op.lte] = to;
    }
  }

  return Object.keys(range).length ? range : null;
};

const getOrderItemQuantity = (orderItem) => {
  const bookingData = orderItem.booking_data || {};
  const pricing = orderItem.pricing || {};
  const quantity =
    Number(bookingData.quantity) ||
    Number(pricing.quantity) ||
    Number(bookingData.guests) ||
    1;

  return Math.max(quantity, 1);
};

const normalizeCustomerMobile = ({ country_code, phone }) =>
  parsePhoneNumberFromString(`${country_code}${phone}`)?.number || null;

const formatRentalPoint = (point) => {
  if (!point) {
    return null;
  }

  return {
    name: point.name || null,
    slug: point.slug || null,
    address: point.address || null,
  };
};

const mergeKycPassengers = (bookingPayload) => {
  const passengers = [
    ...(bookingPayload?.kyc_per_passanger || []),
    ...(bookingPayload?.kyc_upto_max || []),
  ];

  return passengers.length ? passengers : null;
};

const formatRentalDetails = (rentalDetails) => {
  if (!rentalDetails) {
    return null;
  }

  const details = {
    pickup_time: rentalDetails.pickup_time,
    pickup_type: rentalDetails.pickup_type,
    drop_type: rentalDetails.drop_type,
  };

  if (rentalDetails.pickup_point) {
    details.pickup_point = formatRentalPoint(rentalDetails.pickup_point);
  }

  if (rentalDetails.pickup_hotel_name) {
    details.pickup_hotel_name = rentalDetails.pickup_hotel_name;
  }

  if (rentalDetails.drop_point) {
    details.drop_point = formatRentalPoint(rentalDetails.drop_point);
  }

  if (rentalDetails.drop_hotel_name) {
    details.drop_hotel_name = rentalDetails.drop_hotel_name;
  }

  return details;
};

const formatTransferLocation = (location) => {
  if (!location) {
    return null;
  }

  return {
    id: location.id || null,
    name: location.name || null,
    type: location.type || null,
    address: location.address || null,
    place_types: location.place_types || [],
  };
};

const getInventorySlotIdsForOrderItem = ({ orderItem, estimate }) => {
  const inventorySlots = estimate?.metadata?.inventory_slots;

  if (
    orderItem.booking_mode === "date_range" &&
    Array.isArray(inventorySlots) &&
    inventorySlots.length
  ) {
    return [
      ...new Set(
        inventorySlots
          .map((slot) => Number(slot.vendor_schedule_slot_id))
          .filter((slotId) => Number.isInteger(slotId) && slotId > 0),
      ),
    ];
  }

  const slotId = Number(estimate?.vendor_schedule_slot_id);

  return Number.isInteger(slotId) && slotId > 0 ? [slotId] : [];
};

const buildOrderItemBookingData = ({
  estimate,
  product,
  payload,
  kycUptoMaxSection,
}) => {
  const quotation = estimate.quotation || {};
  const availability = quotation.availability || {};
  const bookingData = estimate.booking_data || {};
  const pricing = estimate.pricing || {};
  const selectedSlot = availability.selected_slot || null;
  const compactObject = (object) =>
    Object.fromEntries(
      Object.entries(object).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    );

  // If the product has kyc_upto_max enabled, the guest count is whatever
  // the customer actually filled in that array (not capped/tied to the
  // estimate's guests), since that section has no exact-count requirement.
  const guests =
    kycUptoMaxSection && Array.isArray(payload?.kyc_upto_max) && payload.kyc_upto_max.length
      ? payload.kyc_upto_max.length
      : bookingData.guests || 1;

  const snapshot = {
    booking_mode: estimate.booking_mode,
    guests,
    quantity: bookingData.quantity || pricing.quantity || 1,
    vendor: {
      vendor_id: estimate.vendor_id || null,
      vendor_product_id: estimate.vendor_product_id || null,
    },
    product: compactObject({
      slug: quotation.product?.slug,
      name: quotation.product?.name,
    }),
    location: compactObject({
      slug: quotation.location?.slug,
      name: quotation.location?.name,
    }),
    pricing: compactObject({
      currency: pricing.currency,
      pricing_type: pricing.pricing_type,
      unit_price: pricing.unit_price,
      quantity: pricing.quantity,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      tax: pricing.tax,
      grand_total: pricing.grand_total,
    }),
  };

  if (bookingData.date) {
    snapshot.date = bookingData.date;
  }

  if (bookingData.pickup_date) {
    snapshot.pickup_date = bookingData.pickup_date;
  }

  if (bookingData.pickup_time) {
    snapshot.pickup_time = bookingData.pickup_time;
  }

  if (bookingData.preferred_time) {
    snapshot.preferred_time = bookingData.preferred_time;
  }

  if (bookingData.return_date) {
    snapshot.return_date = bookingData.return_date;
  }

  if (bookingData.drop_time) {
    snapshot.drop_time = bookingData.drop_time;
  }

  if (bookingData.rental_days) {
    snapshot.rental_days = bookingData.rental_days;
  }

  if (bookingData.transfer_type) {
    snapshot.transfer_type = bookingData.transfer_type;
  }

  if (bookingData.pickup_location) {
    snapshot.pickup_location = formatTransferLocation(
      bookingData.pickup_location,
    );
  }

  if (bookingData.drop_location) {
    snapshot.drop_location = formatTransferLocation(
      bookingData.drop_location,
    );
  }

  if (selectedSlot) {
    snapshot.selected_slot = compactObject({
      name: selectedSlot.name,
      slot_type: selectedSlot.slot_type,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      price: selectedSlot.price,
    });
  }

  return snapshot;
};

const reserveInventoryForConfirmedOrder = async ({ order, transaction }) => {
  const orderItems = await OrderItem.findAll({
    where: {
      order_id: order.id,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const estimate = await BookingEstimate.findOne({
    where: {
      estimate_id: order.estimate_id,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  for (const orderItem of orderItems) {
    const quantity = getOrderItemQuantity(orderItem);
    const inventorySlotIds = getInventorySlotIdsForOrderItem({
      orderItem,
      estimate,
    });

    if (
      ["single_date", "date_range"].includes(orderItem.booking_mode) &&
      !inventorySlotIds.length
    ) {
      const error = new Error(
        "Inventory information is missing for this order. Please create a fresh estimate.",
      );
      error.status = 409;
      throw error;
    }

    for (const slotId of inventorySlotIds) {
      const scheduleSlot = await VendorScheduleSlot.findByPk(slotId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!scheduleSlot) {
        const error = new Error("Inventory slot not found for this order.");
        error.status = 409;
        throw error;
      }

      const booked = Number(scheduleSlot.booked) || 0;
      const available = Number(scheduleSlot.available) || 0;
      const minBookablePerBooking =
        Number(scheduleSlot.min_bookable_per_booking) || 1;

      if (quantity < minBookablePerBooking) {
        const error = new Error(
          `A minimum of ${minBookablePerBooking} is required for this booking.`,
        );
        error.status = 409;
        throw error;
      }

      if (available < quantity) {
        const error = new Error("Insufficient inventory for this order.");
        error.status = 409;
        throw error;
      }

      await scheduleSlot.update(
        {
          booked: booked + quantity,
          available: available - quantity,
        },
        {
          transaction,
        },
      );
    }
  }
};

const formatOrderListItem = (order) => {
  const plainOrder = order.toJSON();
  const items = plainOrder.items || [];
  const payments = plainOrder.payments || [];
  const firstItem = items[0] || null;
  const latestPayment = payments[0] || null;

  return {
    order_id: plainOrder.order_id,
    estimate_id: plainOrder.estimate_id,
    order_status: plainOrder.order_status,
    payment_status: plainOrder.payment_status,
    currency: plainOrder.currency,
    subtotal: Number(plainOrder.subtotal),
    discount: Number(plainOrder.discount),
    tax: Number(plainOrder.tax),
    grand_total: Number(plainOrder.grand_total),
    created_at: plainOrder.created_at,
    updated_at: plainOrder.updated_at,

    customer: plainOrder.customer
      ? {
          customer_id: plainOrder.customer.customer_id,
          first_name: plainOrder.customer.first_name,
          last_name: plainOrder.customer.last_name,
          email: plainOrder.customer.email,
          mobile: plainOrder.customer.mobile,
          country: plainOrder.customer.country,
        }
      : null,

    item_count: items.length,

    primary_item: firstItem
      ? {
          product_id: firstItem.product_id,
          product_name: firstItem.product_name,
          product_slug: firstItem.product_slug,
          thumbnail_url: firstItem.thumbnail_url,
          location_id: firstItem.location_id,
          location_name: firstItem.location_name,
          location_slug: firstItem.location_slug,
          vendor_id: firstItem.vendor_id,
          vendor_product_id: firstItem.vendor_product_id,
          booking_mode: firstItem.booking_mode,
          status: firstItem.status,
        }
      : null,

    latest_payment: latestPayment
      ? {
          payment_id: latestPayment.payment_id,
          gateway: latestPayment.gateway,
          gateway_order_id: latestPayment.gateway_order_id,
          gateway_payment_id: latestPayment.gateway_payment_id,
          amount: Number(latestPayment.amount),
          currency: latestPayment.currency,
          status: latestPayment.status,
          paid_at: latestPayment.paid_at,
          expires_at: latestPayment.expires_at,
          created_at: latestPayment.created_at,
        }
      : null,
  };
};

const normalizePickupDropPayload = (payload) => {
  const clean = { ...payload };

  /* ---------- PICKUP ---------- */
  if (clean.pickupType === "hotel") {
    delete clean.pickup;
  } else {
    delete clean.pickupHotelName;
  }

  /* ---------- DROP ---------- */
  if (clean.dropType === "hotel") {
    delete clean.drop;
  } else {
    delete clean.dropHotelName;
  }

  return clean;
};

const createBikeRentalOrder = async (req, res) => {
  try {
    const {
      locationName,
      startDate,
      endDate,
      quantity,
      paymentType,

      pickupType,
      dropType,
      pickup,
      drop,

      pickupHotelName,
      dropHotelName,

      pickupTime,

      customer,
      usePaymentLink = false,
    } = req.body;

    const payload = normalizePickupDropPayload(req.body);

    /* -------------------- VALIDATION -------------------- */
    const errors = validate(payload);
    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors,
      });
    }

    /* -------------------- AVAILABILITY -------------------- */
    const availability = bikeRentalService.bikeRentals.checkAvailability({
      locationName,
      startDate,
      endDate,
      quantity,
      pickupType,
      dropType,
      pickup,
      drop,
    });

    if (!availability.success) {
      return res.status(400).json(availability);
    }

    /* -------------------- SELECT PRICING -------------------- */
    const pricing = availability.data.pricing.find(
      (p) => p.paymentType === paymentType,
    );

    if (!pricing) {
      return res.status(400).json({
        success: false,
        message: `Invalid Payment Mode Selected. Available options: ${availability.data.pricing
          .map((p) => p.label)
          .join(", ")}`,
      });
    }

    /*
      pricing already contains:
      - rentalAmount
      - pickupCharge
      - dropCharge
      - total
    */

    /* -------------------- GOOGLE SHEET ORDER -------------------- */
    const sheetResult = await googleSheetService.createOrder({
      productType: "bike-rentals",
      locationName,
      startDate,
      endDate,
      quantity,
      rentalDays: availability.data.rentalDays,

      pickupType,
      dropType,
      pickup,
      drop,
      pickupHotelName,
      dropHotelName,

      pickupTime,
      dropTime: pickupTime,

      pricing: {
        paymentType: pricing.paymentType,
        label: pricing.label,
        amountPerDay: pricing.amountPerDay,
        rentalAmount: pricing.rentalAmount,
        pickupCharge: pricing.pickupCharge,
        dropCharge: pricing.dropCharge,
        total: pricing.total,
      },

      customer,
    });

    if (!sheetResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to create order in sheet",
      });
    }

    const orderId = sheetResult.orderId;
    let paymentResult;

    /* -------------------- PAYMENT -------------------- */
    const paymentPayload = {
      amount: pricing.total, // ✅ single source of truth
      currency: "INR",
      description: `Bike Rental Payment - ${orderId}`,
      notes: {
        orderId,
        productType: "bike-rentals",
        location: locationName,
        startDate,
        endDate,
        quantity,
        pickupType,
        dropType,
        pickup,
        drop,
        pickupHotelName,
        dropHotelName,
        paymentType: pricing.label,
        customerName: `${customer.firstName} ${customer.lastName}`,
      },
    };

    if (usePaymentLink) {
      paymentResult = await razorpayService.createPaymentLink({
        ...paymentPayload,
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
          mobile: customer.mobile,
        },
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay payment link",
        });
      }
    } else {
      paymentResult = await razorpayService.createRazorpayOrder({
        orderId,
        totalPrice: pricing.total,
        currency: "INR",
        notes: paymentPayload.notes,
      });

      if (!paymentResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }
    }

    /* -------------------- SUCCESS -------------------- */
    return res.json({
      success: true,
      orderId,
      pricing,
      payment: paymentResult.data,
      paymentTypeUsed: usePaymentLink ? "link" : "order",
    });
  } catch (error) {
    console.error("Error creating bike rental order:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const createOrderService = async ({ estimateId, payload }) => {
  const transaction = await sequelize.transaction();

  try {
    /*
    |--------------------------------------------------------------------------
    | Estimate
    |--------------------------------------------------------------------------
    */

    const estimate = await BookingEstimate.findOne({
      where: {
        estimate_id: estimateId,
        //status: "draft", should be able to retry
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!estimate) {
      throw {
        status: 404,
        message: "Estimate not found.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Expiry
    |--------------------------------------------------------------------------
    */

    // if (new Date() > estimate.expires_at) {
    //   throw {
    //     status: 410,
    //     message: "Estimate has expired.",
    //   };
    // }

    /*
    |--------------------------------------------------------------------------
    | Slot Required if the product type is slot based and no slots found
    |--------------------------------------------------------------------------
    */

    const requiresSlotSelection =
      estimate.booking_mode === "single_date" &&
      Array.isArray(estimate.quotation?.availability?.slots) &&
      estimate.quotation.availability.slots.length > 0;

    if (requiresSlotSelection && !estimate.vendor_schedule_slot_id) {
      throw {
        status: 400,
        message: "Please select a slot.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Product
    |--------------------------------------------------------------------------
    */

    const product = await Product.findByPk(estimate.product_id, {
      include: [
        {
          model: BookingTemplate,
          as: "bookingTemplate",
        },
      ],
      transaction,
    });

    if (!product) {
      throw {
        status: 404,
        message: "Product not found.",
      };
    }

    if (!product.bookingTemplate) {
      throw {
        status: 500,
        message: "Booking template not configured.",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Infant Documents
    |--------------------------------------------------------------------------
    | has_infant: false with an empty documents array is not a real infant
    | documents submission - drop it so it doesn't get validated/stored as
    | a section (documents is Joi.forbidden() when has_infant is false).
    */

    if (
      payload.infant_documents &&
      payload.infant_documents.has_infant === false &&
      Array.isArray(payload.infant_documents.documents) &&
      payload.infant_documents.documents.length === 0
    ) {
      delete payload.infant_documents;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Booking Payload
    |--------------------------------------------------------------------------
    */

    const validation = validateBookingPayload({
      bookingTemplate: product.bookingTemplate,
      payload,
    });

    if (!validation.valid) {
      throw {
        status: 422,
        message: "Validation failed.",
        errors: validation.errors,
      };
    }

    const guestsSelected = Number(estimate.booking_data?.guests) || 1;

    const hasParticipantsSection = product.bookingTemplate.booking_page_schema?.sections?.some(
      (section) =>
        section.enabled &&
        section.section === BOOKING_SECTIONS.PARTICIPANTS,
    );

    if (hasParticipantsSection && Array.isArray(payload.participants)) {
      if (payload.participants.length !== guestsSelected) {
        throw {
          status: 422,
          message: "Validation failed.",
          errors: [
            {
              section: "participants",
              errors: [
                `participants must have exactly one entry per selected guest (${guestsSelected}).`,
              ],
            },
          ],
        };
      }
    }

    const hasRentalDetails = product.bookingTemplate.booking_page_schema?.sections?.some(
      (section) =>
        section.enabled &&
        section.section === BOOKING_SECTIONS.RENTAL_DETAILS,
    );

    if (hasRentalDetails) {
      const rentalDetailsValidation =
        bikeRentalService.bikeRentals.validateCheckoutRentalDetails({
          locationSlug: estimate.quotation?.location?.slug,
          rentalDetails: payload.rental_details,
        });

      if (!rentalDetailsValidation.success) {
        throw {
          status: 422,
          message: "Validation failed.",
          errors: [
            {
              section: "rental_details",
              errors: [rentalDetailsValidation.message],
            },
          ],
        };
      }
    } else {
      delete payload.rental_details;
    }

    /*
    |--------------------------------------------------------------------------
    | KYC Per Passenger
    |--------------------------------------------------------------------------
    */

    const hasKycSection = product.bookingTemplate.booking_page_schema?.sections?.some(
      (section) =>
        section.enabled &&
        section.section === BOOKING_SECTIONS.KYC_PER_PASSENGER,
    );

    if (hasKycSection && Array.isArray(payload.kyc_per_passanger)) {
      if (payload.kyc_per_passanger.length !== guestsSelected) {
        throw {
          status: 422,
          message: "Validation failed.",
          errors: [
            {
              section: "kyc_per_passanger",
              errors: [
                `kyc_per_passanger must have exactly one entry per selected guest (${guestsSelected}).`,
              ],
            },
          ],
        };
      }

      await verifyKycDocumentOwnership({
        passengers: payload.kyc_per_passanger,
        estimateId: estimate.id,
        sectionName: "kyc_per_passanger",
        transaction,
      });
    } else {
      delete payload.kyc_per_passanger;
    }

    /*
    |--------------------------------------------------------------------------
    | KYC Up To Max
    |--------------------------------------------------------------------------
    | Same document-ownership integrity check as kyc_per_passanger, but no
    | exact-guest-count requirement - array length is capped via that
    | section's config.max_entries (enforced generically in
    | validateBookingPayload, before this point).
    */

    const kycUptoMaxSection = product.bookingTemplate.booking_page_schema?.sections?.find(
      (section) =>
        section.enabled &&
        section.section === BOOKING_SECTIONS.KYC_UPTO_MAX,
    );

    if (kycUptoMaxSection && Array.isArray(payload.kyc_upto_max)) {
      await verifyKycDocumentOwnership({
        passengers: payload.kyc_upto_max,
        estimateId: estimate.id,
        sectionName: "kyc_upto_max",
        transaction,
      });
    } else {
      delete payload.kyc_upto_max;
    }

    /*
    |--------------------------------------------------------------------------
    | Nationality-Restricted Slot
    |--------------------------------------------------------------------------
    | The selected slot (SLOT-priced or the FIXED/default slot) may be
    | restricted to INDIAN_ONLY or NON_INDIAN_ONLY nationals (ALL = no
    | restriction). participants and kyc_per_passanger are each checked
    | independently - same rule as the guest-count check above, they
    | aren't assumed to line up by index.
    */

    const nationalityRestriction =
      estimate.quotation?.availability?.nationality_restriction || "ALL";

    if (nationalityRestriction !== "ALL") {
      const isNonIndianOnly = nationalityRestriction === "NON_INDIAN_ONLY";
      const disallowedKycNationality = isNonIndianOnly ? "Indian" : "Foreigner";
      const restrictionMessage = `The selected slot is reserved for ${
        isNonIndianOnly ? "non-Indian" : "Indian"
      } nationals only.`;
      const restrictionErrors = [];

      if (
        hasParticipantsSection &&
        Array.isArray(payload.participants) &&
        payload.participants.some((participant) => {
          const nationality = String(participant.nationality || "")
            .trim()
            .toLowerCase();

          return isNonIndianOnly
            ? nationality === "indian"
            : nationality !== "indian" && nationality !== "";
        })
      ) {
        restrictionErrors.push({
          section: "participants",
          errors: [restrictionMessage],
        });
      }

      if (
        hasKycSection &&
        Array.isArray(payload.kyc_per_passanger) &&
        payload.kyc_per_passanger.some(
          (passenger) => passenger.nationality === disallowedKycNationality,
        )
      ) {
        restrictionErrors.push({
          section: "kyc_per_passanger",
          errors: [restrictionMessage],
        });
      }

      if (
        kycUptoMaxSection &&
        Array.isArray(payload.kyc_upto_max) &&
        payload.kyc_upto_max.some(
          (passenger) => passenger.nationality === disallowedKycNationality,
        )
      ) {
        restrictionErrors.push({
          section: "kyc_upto_max",
          errors: [restrictionMessage],
        });
      }

      if (restrictionErrors.length) {
        throw {
          status: 422,
          message: "Validation failed.",
          errors: restrictionErrors,
        };
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Infant Documents
    |--------------------------------------------------------------------------
    */

    const hasInfantDocumentsSection = product.bookingTemplate.booking_page_schema?.sections?.some(
      (section) =>
        section.enabled &&
        section.section === BOOKING_SECTIONS.INFANT_DOCUMENTS,
    );

    if (hasInfantDocumentsSection && payload.infant_documents) {
      const documentIds = (payload.infant_documents.documents || [])
        .map((document) => document.document_id)
        .filter((id) => id !== null && id !== undefined);

      if (documentIds.length) {
        const documents = await Document.findAll({
          where: {
            id: documentIds,
            entity_type: "estimate",
            entity_id: estimate.id,
            status: "active",
          },
          transaction,
        });

        if (documents.length !== new Set(documentIds).size) {
          throw {
            status: 422,
            message: "Validation failed.",
            errors: [
              {
                section: "infant_documents",
                errors: [
                  "One or more infant documents are invalid or do not belong to this estimate.",
                ],
              },
            ],
          };
        }
      }
    } else {
      delete payload.infant_documents;
    }

    /*
    |--------------------------------------------------------------------------
    | Find / Create Customer
    |--------------------------------------------------------------------------
    */

    const customerMobile = normalizeCustomerMobile(payload.customer_details);

    let customer = await Customer.findOne({
      where: {
        mobile: {
          [Op.in]: [customerMobile, payload.customer_details.phone],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!customer) {
      customer = await Customer.create(
        {
          first_name: payload.customer_details.first_name,

          last_name: payload.customer_details.last_name,

          email: payload.customer_details.email,

          mobile: customerMobile,

          country: payload.customer_details.country,
        },
        {
          transaction,
        },
      );
    } else {
      await customer.update(
        {
          first_name:
            customer.first_name || payload.customer_details.first_name,

          last_name: customer.last_name || payload.customer_details.last_name,

          email: customer.email || payload.customer_details.email,

          country: customer.country || payload.customer_details.country,

          mobile: customerMobile,
        },
        {
          transaction,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Order
    |--------------------------------------------------------------------------
    */

    const order = await Order.create(
      {
        estimate_id: estimate.estimate_id,

        customer_id: customer.id,

        customer_details: JSON.parse(JSON.stringify(payload.customer_details)),

        currency: estimate.pricing.currency,

        subtotal: estimate.pricing.subtotal,

        discount: estimate.pricing.discount,

        tax: estimate.pricing.tax,

        grand_total: estimate.pricing.grand_total,

        payment_status: "pending",

        order_status: "pending_payment",
      },
      {
        transaction,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Order Item
    |--------------------------------------------------------------------------
    */

    const orderItemBookingData = buildOrderItemBookingData({
      estimate,
      product,
      payload,
      kycUptoMaxSection,
    });

    const orderItem = await OrderItem.create(
      {
        order_id: order.id,

        line_no: 1,

        product_id: estimate.product_id,

        product_name: estimate.quotation.product.name,

        product_slug: estimate.quotation.product.slug,

        thumbnail_url: estimate.quotation.product.thumbnail_url,

        location_id: estimate.location_id,

        location_name: estimate.quotation.location.name,

        location_slug: estimate.quotation.location.slug,

        vendor_product_id: estimate.vendor_product_id,

        vendor_id: estimate.vendor_id,

        vendor_schedule_id: null,

        vendor_schedule_slot_id: null,

        booking_mode: estimate.booking_mode,

        booking_template_id: product.bookingTemplate.id,

        booking_template_version: product.bookingTemplate.version,

        booking_data: JSON.parse(JSON.stringify(orderItemBookingData)),

        booking_payload: JSON.parse(JSON.stringify(payload)),

        quotation: JSON.parse(JSON.stringify(estimate.quotation)),

        pricing: JSON.parse(JSON.stringify(estimate.pricing)),

        status: "pending",
      },
      {
        transaction,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Participants
    |--------------------------------------------------------------------------
    */

    if (Array.isArray(payload.participants)) {
      await OrderParticipant.bulkCreate(
        payload.participants.map((participant) => ({
          order_id: order.id,

          order_item_id: orderItem.id,

          first_name: participant.first_name,

          last_name: participant.last_name,

          age: participant.age,

          gender: participant.gender,

          nationality: participant.nationality,

          height: participant.height,

          weight: participant.weight,

          shoe_size: participant.shoe_size,

          passport_number: participant.passport_number,

          id_number: participant.id_number,

          seat_preference: participant.seat_preference,

          seat_number: participant.seat_number,

          medical_declaration: payload.medical_declaration || {},

          emergency_contact: payload.emergency_contact || {},
        })),
        {
          transaction,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Estimate
    |--------------------------------------------------------------------------
    */

    estimate.status = "converted";

    estimate.order_public_id = order.order_id;

    estimate.converted_at = new Date();

    await estimate.save({
      transaction,
    });

    /*
    |--------------------------------------------------------------------------
    | Commit
    |--------------------------------------------------------------------------
    */

    await transaction.commit();

    return {
      order,
      orderItem,
      customer,
    };
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};

const createOrder = async (req, res) => {
  try {
    const { estimate_id } = req.params;

    const result = await createOrderService({
      estimateId: estimate_id,
      payload: req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: {
        order_id: result.order.order_id,
        payment_status: result.order.payment_status,
        order_status: result.order.order_status,
        grand_total: result.order.grand_total,
      },
    });
  } catch (error) {
    console.error("[createOrder]", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create order.",
      errors: error.errors || undefined,
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      order_status,
      payment_status,
      search,
      order_id,
      estimate_id,
      customer_mobile,
      customer_email,
      product_id,
      location_id,
      vendor_id,
      vendor_product_id,
      booking_mode,
      date_from,
      date_to,
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    const pageNumber = parsePositiveInteger(page, 1);
    const pageSize = parsePositiveInteger(limit, 20, 100);
    const offset = (pageNumber - 1) * pageSize;

    const allowedSortColumns = new Set([
      "created_at",
      "updated_at",
      "grand_total",
      "order_status",
      "payment_status",
    ]);

    const orderWhere = {};
    const customerWhere = {};
    const itemWhere = {};

    if (order_status) {
      orderWhere.order_status = order_status;
    }

    if (payment_status) {
      orderWhere.payment_status = payment_status;
    }

    if (order_id) {
      orderWhere.order_id = order_id;
    }

    if (estimate_id) {
      orderWhere.estimate_id = estimate_id;
    }

    const createdAtFilter = buildDateRangeFilter({
      dateFrom: date_from,
      dateTo: date_to,
    });

    if (createdAtFilter) {
      orderWhere.created_at = createdAtFilter;
    }

    if (customer_mobile) {
      customerWhere.mobile = customer_mobile;
    }

    if (customer_email) {
      customerWhere.email = customer_email;
    }

    if (product_id) {
      itemWhere.product_id = product_id;
    }

    if (location_id) {
      itemWhere.location_id = location_id;
    }

    if (vendor_id) {
      itemWhere.vendor_id = vendor_id;
    }

    if (vendor_product_id) {
      itemWhere.vendor_product_id = vendor_product_id;
    }

    if (booking_mode) {
      itemWhere.booking_mode = booking_mode;
    }

    if (search && String(search).trim()) {
      const searchTerm = String(search).trim();
      const searchLike = {
        [Op.like]: `%${searchTerm}%`,
      };

      orderWhere[Op.or] = [
        {
          order_id: searchLike,
        },
        {
          estimate_id: searchLike,
        },
        {
          "$customer.first_name$": searchLike,
        },
        {
          "$customer.last_name$": searchLike,
        },
        {
          "$customer.email$": searchLike,
        },
        {
          "$customer.mobile$": searchLike,
        },
        {
          "$items.product_name$": searchLike,
        },
        {
          "$items.location_name$": searchLike,
        },
      ];
    }

    const sortColumn = allowedSortColumns.has(sort_by) ? sort_by : "created_at";
    const sortDirection =
      String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const orders = await Order.findAndCountAll({
      where: orderWhere,
      distinct: true,

      attributes: [
        "id",
        "order_id",
        "estimate_id",
        "currency",
        "subtotal",
        "discount",
        "tax",
        "grand_total",
        "payment_status",
        "order_status",
        "created_at",
        "updated_at",
      ],

      include: [
        {
          model: Customer,
          as: "customer",
          attributes: [
            "customer_id",
            "first_name",
            "last_name",
            "email",
            "mobile",
            "country",
          ],
          where: Object.keys(customerWhere).length ? customerWhere : undefined,
          required:
            Boolean(search && String(search).trim()) ||
            Object.keys(customerWhere).length > 0,
        },
        {
          model: OrderItem,
          as: "items",
          attributes: [
            "product_id",
            "product_name",
            "product_slug",
            "thumbnail_url",
            "location_id",
            "location_name",
            "location_slug",
            "vendor_id",
            "vendor_product_id",
            "booking_mode",
            "status",
          ],
          where: Object.keys(itemWhere).length ? itemWhere : undefined,
          required:
            Boolean(search && String(search).trim()) ||
            Object.keys(itemWhere).length > 0,
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "payment_id",
            "gateway",
            "gateway_order_id",
            "gateway_payment_id",
            "amount",
            "currency",
            "status",
            "paid_at",
            "expires_at",
            "created_at",
          ],
          required: false,
          separate: true,
          limit: 1,
          order: [["created_at", "DESC"]],
        },
      ],

      order: [[sortColumn, sortDirection]],
      limit: pageSize,
      offset,
      subQuery: false,
    });

    return res.status(200).json({
      success: true,
      page: pageNumber,
      limit: pageSize,
      total: orders.count,
      total_pages: Math.ceil(orders.count / pageSize),
      count: orders.rows.length,
      data: orders.rows.map(formatOrderListItem),
    });
  } catch (error) {
    console.error("[getOrders]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};

const getOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findOne({
      where: {
        order_id,
      },
      attributes: [
        "order_id",
        "estimate_id",
        "currency",
        "subtotal",
        "discount",
        "tax",
        "grand_total",
        "order_status",
        "customer_details",
      ],
      include: [
        {
          model: Payment,
          as: "payments",
          attributes: [
            "payment_id",
            "amount",
            "currency",
            "status",
            "paid_at",
            "created_at",
          ],
        },

        {
          model: OrderItem,
          as: "items",

          attributes: [
            "product_name",
            "thumbnail_url",
            "location_name",
            "location_slug",
            "booking_data",
            "booking_payload",
            "quotation",
            "pricing",
            "created_at",
          ],
          include: {
            model: OrderParticipant,
            as: "participants",
          },
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const formattedOrder = order.toJSON();

    formattedOrder.items = formattedOrder.items.map((item) => ({
      product_name: item.product_name,
      thumbnail_url: item.thumbnail_url,
      location_name: item.location_name,
      location_slug: item.location_slug,
      pricing: item.pricing,
      created_at: item.created_at,
      participants: item.participants,
      rental_details: formatRentalDetails(
        item.booking_payload?.rental_details,
      ),
      flight_details: item.booking_payload?.flight_details || null,
      ferry_details: item.booking_payload?.ferry_details || null,
      medical_declaration: item.booking_payload?.medical_declaration,
      kyc_per_passanger: mergeKycPassengers(item.booking_payload),
      infant_documents: item.booking_payload?.infant_documents || null,
      ...(item.quotation?.opt_for_pickup_and_drop !== undefined
        ? {
            opt_for_pickup_and_drop:
              item.booking_payload?.opt_for_pickup_and_drop ?? false,
          }
        : {}),
      ...(item.quotation?.has_agreed_to_permit_charge !== undefined
        ? {
            has_agreed_to_permit_charge:
              item.booking_payload?.has_agreed_to_permit_charge ?? false,
          }
        : {}),
      ...(item.quotation?.agree_to !== undefined
        ? { agree_to: item.booking_payload?.agree_to ?? {} }
        : {}),
      booking_data: {
        guests: item.booking_data?.guests,
        quantity: item.booking_data?.quantity,
        date: item.booking_data?.date ?? item.booking_data?.travel_date,
        pickup_date: item.booking_data?.pickup_date,
        pickup_time: item.booking_data?.pickup_time,
        preferred_time: item.booking_data?.preferred_time,
        return_date: item.booking_data?.return_date,
        drop_time: item.booking_data?.drop_time,
        rental_days: item.booking_data?.rental_days,
        transfer_type: item.booking_data?.transfer_type,
        pickup_location: item.booking_data?.pickup_location,
        drop_location: item.booking_data?.drop_location,
        selected_slot: item.booking_data?.selected_slot,
      },
    }));

    return res.json({
      success: true,
      data: formattedOrder,
    });
  } catch (error) {
    console.error("[getOrder]", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
    });
  }
};

const createOrderPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findOne({
      where: {
        order_id,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    /**
     * Already paid
     */

    if (order.payment_status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid.",
      });
    }

    /**
     * Existing pending payment
     */

    let payment = await Payment.findOne({
      where: {
        order_id: order.id,
        gateway: "razorpay",
        status: "pending",
      },
      order: [["created_at", "DESC"]],
    });

    /**
     * Reuse payment
     */

    if (
      payment &&
      payment.gateway_order_id &&
      Number(payment.amount) === Number(order.grand_total) &&
      (!payment.expires_at || payment.expires_at > new Date())
    ) {
      return res.json({
        success: true,

        reused: true,

        data: {
          key: process.env.RAZORPAY_KEY_ID,

          payment_id: payment.payment_id,

          order_id: order.order_id,

          razorpay_order_id: payment.gateway_order_id,

          amount: Number(payment.amount) * 100,

          currency: payment.currency,

          customer: {
            name: `${order.customer_details.first_name} ${order.customer_details.last_name}`,

            email: order.customer_details.email,

            contact: order.customer_details.phone,
          },
        },
      });
    }

    /**
     * Create Razorpay Order
     */

    const paymentResult = await razorpayService.createRazorpayOrder({
      orderId: order.order_id,

      totalPrice: Number(order.grand_total),

      currency: order.currency,

      notes: {
        order_id: order.order_id,
        estimate_id: order.estimate_id,
      },
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to initiate payment.",
      });
    }

    const razorpayOrder = paymentResult.data;

    /**
     * Expire previous payment
     */

    if (payment) {
      payment.status = "expired";
      await payment.save();
    }

    /**
     * Create payment
     */

    payment = await Payment.create({
      order_id: order.id,

      gateway: "razorpay",

      gateway_order_id: razorpayOrder.id,

      amount: order.grand_total,

      currency: order.currency,

      gateway_response: razorpayOrder,

      status: "pending",

      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });

    return res.json({
      success: true,

      reused: false,

      data: {
        key: process.env.RAZORPAY_KEY_ID,

        payment_id: payment.payment_id,

        order_id: order.order_id,

        razorpay_order_id: razorpayOrder.id,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        customer: {
          name: `${order.customer_details.first_name} ${order.customer_details.last_name}`,

          email: order.customer_details.email,

          contact: order.customer_details.phone,
        },
      },
    });
  } catch (error) {
    console.error("[createOrderPayment]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment.",
    });
  }
};

// const verifyOrderPayment = async (req, res) => {
//   const transaction = await sequelize.transaction();

//   try {
//     const { order_id } = req.params;

//     /**
//      * Order
//      */

//     const order = await Order.findOne({
//       where: {
//         order_id,
//       },
//       transaction,
//       lock: transaction.LOCK.UPDATE,
//     });

//     if (!order) {
//       await transaction.rollback();

//       return res.status(404).json({
//         success: false,
//         message: "Order not found.",
//       });
//     }

//     /**
//      * Already paid
//      */

//     if (order.payment_status === "paid") {
//       await transaction.commit();

//       return res.json({
//         success: true,
//         data: {
//           payment_status: order.payment_status,
//           order_status: order.order_status,
//         },
//       });
//     }

//     /**
//      * Latest payment
//      */

//     const payment = await Payment.findOne({
//       where: {
//         order_id: order.id,
//       },
//       order: [["created_at", "DESC"]],
//       transaction,
//     });

//     if (!payment) {
//       await transaction.rollback();

//       return res.status(404).json({
//         success: false,
//         message: "No payment found.",
//       });
//     }

//     /**
//      * Sync with Razorpay
//      */

//     const paymentResult =
//       await razorpayService.fetchPaymentByOrderId(
//         payment.gateway_order_id,
//       );

//     if (!paymentResult.success) {
//       await transaction.rollback();

//       return res.status(500).json({
//         success: false,
//         message: "Unable to verify payment.",
//       });
//     }

//     /**
//      * Pending
//      */

//     if (paymentResult.status === "pending") {
//       await transaction.commit();

//       return res.json({
//         success: true,
//         data: {
//           payment_status: "pending",
//           order_status: order.order_status,
//         },
//       });
//     }

//     /**
//      * Failed
//      */

//     if (paymentResult.status === "failed") {
//       payment.status = "failed";
//       payment.failure_reason =
//         paymentResult.data?.reason || null;

//       await payment.save({
//         transaction,
//       });

//       order.payment_status = "failed";

//       await order.save({
//         transaction,
//       });

//       await transaction.commit();

//       return res.json({
//         success: true,
//         data: {
//           payment_status: "failed",
//           order_status: order.order_status,
//         },
//       });
//     }

//     /**
//      * Success
//      */

//     payment.status = "captured";

//     payment.razorpay_payment_id =
//       paymentResult.data.payment_id;

//     payment.amount = paymentResult.data.amount;

//     payment.method = paymentResult.data.method;

//     payment.currency = paymentResult.data.currency;

//     payment.paid_at = new Date(paymentResult.data.created_at);

//     await payment.save({
//       transaction,
//     });

//     await reserveInventoryForConfirmedOrder({
//       order,
//       transaction,
//     });

//     order.payment_status = "paid";
//     order.order_status = "confirmed";

//     await order.save({
//       transaction,
//     });

//     await OrderItem.update(
//       {
//         status: "confirmed",
//       },
//       {
//         where: {
//           order_id: order.id,
//         },
//         transaction,
//       },
//     );

//     await transaction.commit();

//     return res.json({
//       success: true,
//       data: {
//         payment_status: "paid",
//         order_status: "confirmed",
//       },
//     });
//   } catch (error) {
//     await transaction.rollback();

//     console.error("[verifyOrderPayment]", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to verify payment.",
//     });
//   }
// };

const verifyOrderPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await Order.findOne({
      where: {
        order_id,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.json({
      success: true,
      data: {
        payment_status: order.payment_status,
        order_status: order.order_status,
      },
    });
  } catch (error) {
    console.error("[verifyOrderPayment]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment.",
    });
  }
};

/**
 * Notify customer + team that a payment is still unconfirmed.
 *
 * Called by the frontend when its post-checkout status polling
 * finishes without ever seeing a confirmed payment (e.g. the
 * customer closed the Razorpay checkout modal).
 */
const notifyPaymentPending = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { payment_id } = req.body || {};

    const order = await Order.findOne({
      where: {
        order_id,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid.",
      });
    }

    const payment = await Payment.findOne({
      where: payment_id
        ? { payment_id, order_id: order.id }
        : { order_id: order.id },
      order: [["created_at", "DESC"]],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "No payment attempt found for this order.",
      });
    }

    const result = await sendPaymentPendingEmail({ payment, order });

    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: result.message || "Unable to send payment pending email.",
      });
    }

    return res.json({
      success: true,
      message: "Payment pending email sent.",
    });
  } catch (error) {
    console.error("[notifyPaymentPending]", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send payment pending notification.",
    });
  }
};

module.exports = {
  createBikeRentalOrder,
  createOrder,
  getOrders,
  getOrder,
  createOrderPayment,
  verifyOrderPayment,
  notifyPaymentPending,
};
