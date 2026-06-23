const cron = require("node-cron");

const mediaCleanupCron = require("./media/mediaCleanup.cron");

module.exports = () => {
  console.info("[CRON] Registering jobs");

  // TEST ONLY
  cron.schedule("* * * * *", mediaCleanupCron);

  console.info("[CRON] Media cleanup registered");
};