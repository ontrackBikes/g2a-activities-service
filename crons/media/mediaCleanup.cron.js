const {
  mediaCleanupQueue,
} = require("../../queues/media/mediaCleanup.queue");

module.exports = async () => {
  await mediaCleanupQueue.add(
    "cleanup",
    {}
  );

  console.info(
    "[MediaCleanupCron] queued"
  );
};