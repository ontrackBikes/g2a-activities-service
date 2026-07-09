const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const {
  PAYMENT_SETTLEMENT_QUEUE,
} = require("../../constants/queues");

const REDIS_URL =
  process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const paymentSettlementQueue = new Queue(
  PAYMENT_SETTLEMENT_QUEUE,
  {
    connection,

    defaultJobOptions: {
      attempts: 5,

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
        count: 1000,
      },
    },
  }
);

module.exports = {
  paymentSettlementQueue,
  connection,
};