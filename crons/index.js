const cron = require("node-cron");

const mediaCleanupCron = require("./media/mediaCleanup.cron");
const vendorScheduleCron = require(
  "./vendorSchedule/vendorSchedule.cron"
);

module.exports = () => {
  console.info("[CRON] Registering jobs");

  // Every 6 hours
  cron.schedule(
    "0 */6 * * *",
    mediaCleanupCron,
    {
      timezone: "UTC",
    }
  );

  console.info(
    "[CRON] Media cleanup registered (every 6 hours)"
  );

  // Every day at 02:00 and 14:00 in the business timezone.
  cron.schedule(
    "0 2,14 * * *",
    vendorScheduleCron,
    {
      timezone:
        process.env.APP_TIMEZONE ||
        "Asia/Kolkata",
    },
  );

  console.info(
    "[CRON] Vendor schedule maintenance registered (daily at 02:00 and 14:00)",
  );

  vendorScheduleCron().catch((error) => {
    console.error(
      "[CRON] Failed to queue initial vendor schedule maintenance",
      error,
    );
  });
};
