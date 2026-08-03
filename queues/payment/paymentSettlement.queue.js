const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const {
  PAYMENT_SETTLEMENT_QUEUE,
} = require("../../constants/queues");
const { baseRedisConfig } = require("../../config/redis");

const connection = new IORedis({
  ...baseRedisConfig,
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