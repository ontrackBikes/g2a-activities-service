const cron = require("node-cron");

const mediaCleanupCron = require("./media/mediaCleanup.cron");

module.exports = () => {
  cron.schedule(
    "0 */6 * * *",
    mediaCleanupCron
  );

  console.info(
    "[CRON] Media cleanup registered"
  );
};