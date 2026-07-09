require("dotenv").config();

const { Worker } = require("bullmq");

const {
  connection,
} = require("../../queues/payment/paymentSettlement.queue");

const {
  PAYMENT_SETTLEMENT_QUEUE,
} = require("../../constants/queues");
const { settlePayment } = require("../../services/paymentSettlement.service");



const worker = new Worker(
  PAYMENT_SETTLEMENT_QUEUE,
  async (job) => {
    await settlePayment(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on("active", (job) => {
  console.log(
    `[PaymentSettlementWorker] Processing payment ${job.data.paymentId}`
  );
});

worker.on("completed", (job) => {
  console.log(
    `[PaymentSettlementWorker] Completed payment ${job.data.paymentId}`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[PaymentSettlementWorker] Failed payment ${job?.data?.paymentId}`,
    err
  );
});