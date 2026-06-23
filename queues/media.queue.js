const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MEDIA_QUEUE_NAME = "media-processing";
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const mediaQueue = new Queue(MEDIA_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
});

module.exports = {
  mediaQueue,
  MEDIA_QUEUE_NAME,
  REDIS_URL,
  connection,
};
