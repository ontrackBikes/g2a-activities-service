const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const REDIS_URL =
  process.env.REDIS_URL ||
  "redis://localhost:6379";

const MEDIA_CLEANUP_QUEUE =
  "media-cleanup";

const connection = new IORedis(
  REDIS_URL,
  {
    maxRetriesPerRequest: null,
  }
);

const mediaCleanupQueue = new Queue(
  MEDIA_CLEANUP_QUEUE,
  {
    connection,
    defaultJobOptions: {
      attempts: 2,

      removeOnComplete: {
        age: 24 * 60 * 60,
      },

      removeOnFail: {
        age: 7 * 24 * 60 * 60,
      },
    },
  }
);

module.exports = {
  mediaCleanupQueue,
  MEDIA_CLEANUP_QUEUE,
  connection,
};