const IORedis = require("ioredis");
const sequelize = require("../config/sequelize");

// Dedicated connection for health checks only, lazily connected so it
// doesn't hold up boot and doesn't interfere with the BullMQ connections.
const healthRedis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
healthRedis.on("error", () => {});

const HEALTH_CHECK_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function checkDatabase() {
  const start = Date.now();
  try {
    await withTimeout(sequelize.authenticate(), HEALTH_CHECK_TIMEOUT_MS);
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (error) {
    return { status: "error", latency_ms: Date.now() - start, message: error.message };
  }
}

async function checkRedis() {
  const start = Date.now();
  try {
    await withTimeout(healthRedis.ping(), HEALTH_CHECK_TIMEOUT_MS);
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (error) {
    return { status: "error", latency_ms: Date.now() - start, message: error.message };
  }
}

async function runHealthChecks() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const checks = { database, redis };
  const isHealthy = Object.values(checks).every((check) => check.status === "ok");

  return {
    isHealthy,
    body: {
      status: isHealthy ? "ok" : "down",
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    },
  };
}

module.exports = {
  runHealthChecks,
};
