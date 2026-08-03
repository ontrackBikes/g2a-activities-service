const { mediaCleanupQueue } = require("../../queues/media/mediaCleanup.queue");
const JOBS = require("../../constants/jobNames");

module.exports = async () => {
  const job = await mediaCleanupQueue.add(
    JOBS.CLEANUP_MEDIA,
    {},
    {
      removeOnComplete: true,
    }
  );

  console.info(
    `[MediaCleanupCron] Job queued: ${job.id}`
  );
};