// config/redis.js

const IORedis = require("ioredis");

const baseRedisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
};

const createRedisConnection = (options = {}) => {
  return new IORedis({
    ...baseRedisConfig,
    ...options,
  });
};

module.exports = {
  baseRedisConfig,
  createRedisConnection,
};