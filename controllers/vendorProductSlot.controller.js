const {
  VendorProduct,
  VendorProductSlot,
} = require("../models");

const {
  createVendorProductSlotSchema,
  updateVendorProductSlotSchema,
} = require("../schemas/vendorProductSlot.schema");
const {
  queueVendorProductScheduleSync,
} = require(
  "../queues/vendorSchedule/vendorSchedule.queue"
);

const queueScheduleSync = async ({
  vendorProductId,
  vendorProductSlotId,
  trigger,
}) => {
  try {
    const job =
      await queueVendorProductScheduleSync({
        vendorProductId,
        vendorProductSlotId,
        trigger,
      });

    return {
      queued: true,
      job_id: job.id,
    };
  } catch (error) {
    console.error(
      "[VendorProductSlotController] queueScheduleSync",
      error,
    );

    return {
      queued: false,
      message:
        "Slot saved, but schedule sync could not be queued. Use manual sync to retry.",
    };
  }
};

const createVendorProductSlot = async (
  req,
  res
) => {
  try {
    const { error, value } =
      createVendorProductSlotSchema.validate(
        req.body
      );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

  

    const vendorProduct =
      await VendorProduct.findByPk(
        req.params.id
      );

    if (!vendorProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product not found",
      });
    }

      const existingSlot =
      await VendorProductSlot.findOne({
        where: {
          vendor_product_id: vendorProduct.id,
          slot_name: value.slot_name,
        },
      });

    if (existingSlot) {
      return res.status(409).json({
        success: false,
        message: `Slot '${value.slot_name}' already exists`,
      });
    }

    const slot =
      await VendorProductSlot.create({
        vendor_product_id:
          vendorProduct.id,

        slot_name: value.slot_name,

        start_time:
          value.start_time || null,

        end_time:
          value.end_time || null,

        default_price:
          value.default_price,

        default_capacity:
          value.default_capacity,

        max_bookable_per_booking:
          value.max_bookable_per_booking,

        active:
          value.active ?? true,
      });
    const scheduleSync = await queueScheduleSync({
      vendorProductId: vendorProduct.id,
      vendorProductSlotId: slot.id,
      trigger: "vendor-product-slot-created",
    });

    return res.status(201).json({
      success: true,
      message:
        "Vendor Product Slot created successfully",
      data: slot,
      schedule_sync: scheduleSync,
    });
  } catch (error) {
    console.error(
      "[VendorProductSlotController] createVendorProductSlot",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorProductSlots = async (
  req,
  res
) => {
  try {
    const slots =
      await VendorProductSlot.findAll({
        where: {
          vendor_product_id:
            req.params.id,
        },
        order: [
          ["sort_order", "ASC"],
          ["id", "ASC"],
        ],
      });

    return res.json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    console.error(
      "[VendorProductSlotController] getVendorProductSlots",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getVendorProductSlot = async (
  req,
  res
) => {
  try {
    const slot =
      await VendorProductSlot.findOne({
        where: {
          id: req.params.slotId,
          vendor_product_id:
            req.params.id,
        },
      });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message:
          "Vendor Product Slot not found",
      });
    }

    return res.json({
      success: true,
      data: slot,
    });
  } catch (error) {
    console.error(
      "[VendorProductSlotController] getVendorProductSlot",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateVendorProductSlot =
  async (req, res) => {
    try {
      const { error, value } =
        updateVendorProductSlotSchema.validate(
          req.body
        );

      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.details[0].message,
        });
      }

      const slot =
        await VendorProductSlot.findOne({
          where: {
            id: req.params.slotId,
            vendor_product_id:
              req.params.id,
          },
        });

      if (!slot) {
        return res.status(404).json({
          success: false,
          message:
            "Vendor Product Slot not found",
        });
      }

      await slot.update(value);
      const scheduleSync =
        await queueScheduleSync({
          vendorProductId: req.params.id,
          vendorProductSlotId: slot.id,
          trigger:
            "vendor-product-slot-updated",
        });

      return res.json({
        success: true,
        message:
          "Vendor Product Slot updated successfully",
        data: slot,
        schedule_sync: scheduleSync,
      });
    } catch (error) {
      console.error(
        "[VendorProductSlotController] updateVendorProductSlot",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

const deleteVendorProductSlot =
  async (req, res) => {
    try {
      const slot =
        await VendorProductSlot.findOne({
          where: {
            id: req.params.slotId,
            vendor_product_id:
              req.params.id,
          },
        });

      if (!slot) {
        return res.status(404).json({
          success: false,
          message:
            "Vendor Product Slot not found",
        });
      }

      await slot.update({
        active: false,
      });
      const scheduleSync =
        await queueScheduleSync({
          vendorProductId: req.params.id,
          vendorProductSlotId: slot.id,
          trigger:
            "vendor-product-slot-deactivated",
        });

      return res.json({
        success: true,
        message:
          "Vendor Product Slot deleted successfully",
        schedule_sync: scheduleSync,
      });
    } catch (error) {
      console.error(
        "[VendorProductSlotController] deleteVendorProductSlot",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

module.exports = {
  createVendorProductSlot,
  getVendorProductSlots,
  getVendorProductSlot,
  updateVendorProductSlot,
  deleteVendorProductSlot,
};
