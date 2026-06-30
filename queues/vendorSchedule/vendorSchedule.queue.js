const { Queue } = require("bullmq");
const IORedis = require("ioredis");
const { randomUUID } = require("crypto");

const {
  VENDOR_SCHEDULE_QUEUE,
} = require("../../constants/queues");
const JOBS = require("../../constants/jobNames");

const REDIS_URL =
  process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_OPERATION_TIMEOUT_MS = Math.max(
  Number(
    process.env.QUEUE_OPERATION_TIMEOUT_MS,
  ) || 5000,
  1000,
);

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const vendorScheduleQueue = new Queue(
  VENDOR_SCHEDULE_QUEUE,
  {
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
        count: 1000,
      },
    },
  },
);

const addJobWithTimeout = (
  name,
  data,
  options,
) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(
        new Error(
          "Timed out while queueing vendor schedule sync",
        ),
      );
    }, QUEUE_OPERATION_TIMEOUT_MS);

    vendorScheduleQueue
      .add(name, data, options)
      .then((job) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve(job);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });

const queueVendorProductScheduleSync = async ({
  vendorProductId,
  trigger = "manual",
  vendorProductSlotId = null,
}) => {
  const normalizedVendorProductId = Number(
    vendorProductId,
  );

  if (
    !Number.isInteger(normalizedVendorProductId) ||
    normalizedVendorProductId <= 0
  ) {
    throw new Error(
      "A valid vendor product id is required",
    );
  }

  return addJobWithTimeout(
    JOBS.MAINTAIN_VENDOR_SCHEDULES,
    {
      vendor_product_id:
        normalizedVendorProductId,
      vendor_product_slot_id:
        vendorProductSlotId
          ? Number(vendorProductSlotId)
          : null,
      trigger,
    },
    {
      jobId:
        `vendor-product-schedule-sync-${normalizedVendorProductId}-${randomUUID()}`,
    },
  );
};

module.exports = {
  vendorScheduleQueue,
  queueVendorProductScheduleSync,
  connection,
};
