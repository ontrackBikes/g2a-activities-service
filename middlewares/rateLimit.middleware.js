const rateLimit = require("express-rate-limit");

/**
 * Guards proxies to paid/rate-limited third-party APIs
 * (e.g. Google Places) from being hammered by bots/scrapers.
 */
const placesSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many search requests. Please slow down and try again shortly.",
  },
});

const distanceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many distance requests. Please slow down and try again shortly.",
  },
});

module.exports = {
  placesSearchLimiter,
  distanceLimiter,
};
