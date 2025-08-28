module.exports = {
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 3600,
    checkPeriod: 600
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000
  },
  playwright: {
    headless: true,
    timeout: 30000,
    navigationTimeout: 30000
  },
  locator: {
    maxStrategies: 5,
    confidenceThreshold: 0.7
  }
};