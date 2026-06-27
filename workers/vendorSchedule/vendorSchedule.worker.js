require("dotenv").config();

const { Worker } = require("bullmq");

const executeJob = require(
  "../../services/jobExecutor.service"
);
const {
  runVendorScheduleMaintenance,
} = require(
  "../../services/vendorScheduleMaintenance.service"
);
const cronNames = require("../../constants/cronNames");
const {
  VENDOR_SCHEDULE_QUEUE,
} = require("../../constants/queues");
const {
  connection,
} = require(
  "../../queues/vendorSchedule/vendorSchedule.queue"
);

const worker = new Worker(
  VENDOR_SCHEDULE_QUEUE,
  async () =>
    executeJob(
      cronNames.VENDOR_SCHEDULE_MAINTENANCE,
      runVendorScheduleMaintenance,
    ),
  {
    connection,
    concurrency: 1,
  },
);

worker.on("active", (job) => {
  console.info(
    `[VendorScheduleWorker] Processing job ${job.id}`,
  );
});

worker.on("completed", (job) => {
  console.info(
    `[VendorScheduleWorker] Completed job ${job.id}`,
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `[VendorScheduleWorker] Failed job ${job?.id}`,
    error,
  );
});

const shutdown = async (signal) => {
  console.info(
    `[VendorScheduleWorker] ${signal} received`,
  );
  await worker.close();
  await connection.quit();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

module.exports = worker;
