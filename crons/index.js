const cron = require("node-cron");

const mediaCleanupCron = require("./media/mediaCleanup.cron");

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
};