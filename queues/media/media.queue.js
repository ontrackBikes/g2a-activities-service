const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { MEDIA_PROCESSING_QUEUE } = require("../../constants/queues");
const { baseRedisConfig } = require("../../config/redis");

const MEDIA_QUEUE_NAME = MEDIA_PROCESSING_QUEUE;


const connection = new IORedis({
  ...baseRedisConfig,
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
  connection,
};
