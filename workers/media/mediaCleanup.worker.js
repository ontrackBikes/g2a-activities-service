require("dotenv").config();

const { Worker } = require("bullmq");

const {
  connection,
} = require("../../queues/media/mediaCleanup.queue");

const executeJob = require(
  "../../services/jobExecutor.service"
);

const {
  runMediaCleanup,
} = require(
  "../../services/mediaCleanup.service"
);
const cronNames = require("../../constants/cronNames");
const { MEDIA_CLEANUP_QUEUE } = require("../../constants/queues");

const worker = new Worker(
  MEDIA_CLEANUP_QUEUE,
  async () => {
    await executeJob(
      cronNames.MEDIA_CLEANUP,
      async () => {
        return runMediaCleanup();
      }
    );
  },
  {
    connection,
    concurrency: 1,
  }
);

worker.on("active", (job) => {
  console.log(
    `[MediaCleanupWorker] Processing job ${job.id}`
  );
});

worker.on("completed", (job) => {
  console.log(
    `[MediaCleanupWorker] Completed job ${job.id}`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[MediaCleanupWorker] Failed job ${job?.id}`,
    err
  );
});