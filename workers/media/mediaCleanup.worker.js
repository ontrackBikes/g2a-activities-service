require("dotenv").config();

const { Worker } = require("bullmq");

const {
  connection,
  MEDIA_CLEANUP_QUEUE,
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