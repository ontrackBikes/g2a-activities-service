const {
  mediaCleanupQueue,
} = require("../queues/media/mediaCleanup.queue");

(async () => {
  const job = await mediaCleanupQueue.add(
    "cleanup-media",
    {}
  );

  console.log("Job queued", job.id);

  process.exit(0);
})();