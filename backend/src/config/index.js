// backend/src/config/index.js - Enhanced version
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
    headless: process.env.NODE_ENV === 'production' ? true : false,
    timeout: 30000,
    navigationTimeout: 30000,
    // Enhanced browser configuration
    browser: {
      // Use system Chrome if Playwright browsers aren't available
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    }
  },
  locator: {
    maxStrategies: 5,
    confidenceThreshold: 0.7
  }
};