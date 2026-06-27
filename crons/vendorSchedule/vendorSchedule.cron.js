const moment = require("moment-timezone");

const {
  vendorScheduleQueue,
} = require(
  "../../queues/vendorSchedule/vendorSchedule.queue"
);
const JOBS = require("../../constants/jobNames");

const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Asia/Kolkata";

module.exports = async () => {
  const inventoryDate = moment()
    .tz(APP_TIMEZONE)
    .format("YYYY-MM-DD");

  const job = await vendorScheduleQueue.add(
    JOBS.MAINTAIN_VENDOR_SCHEDULES,
    {
      inventory_date: inventoryDate,
    },
    {
      jobId: `vendor-schedule-${inventoryDate}`,
    },
  );

  console.info(
    `[VendorScheduleCron] Job queued: ${job.id}`,
  );
};
