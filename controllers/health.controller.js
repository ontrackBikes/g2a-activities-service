const { runHealthChecks } = require("../utils/healthCheck");

// Polled by the frontend to detect if the API or its dependencies
// (db, redis) are down.
const getHealth = async (_req, res) => {
  const { isHealthy, body } = await runHealthChecks();

  return res.status(isHealthy ? 200 : 503).json(body);
};

module.exports = {
  getHealth,
};
