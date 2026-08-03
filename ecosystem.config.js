module.exports = {
  apps: [
    {
      name: "activities-service-prod",
      script: "server.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "activities-media-worker",
      script: "workers/media-processing.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "activities-media-cleanup-worker",
      script: "workers/media-cleanup.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "activities-vendor-schedule-worker",
      script: "workers/vendor-schedule.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "activities-payment-settlement-worker",
      script: "workers/payment-settlement.js",
      env: {
        NODE_ENV: "development",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};