// backend/server.js - Updated with script generation endpoints
require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info('Created logs directory');
}

const server = app.listen(PORT, () => {
  logger.info(`🚀 Dynamic Locator Generator Server`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Server running on http://localhost:${PORT}`);
  logger.info(`🔧 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  logger.info(`📁 Uploads directory: ${uploadsDir}`);
  logger.info(`📋 Available endpoints:`);
  
  // Locator endpoints
  logger.info(`   📍 Locator Generation:`);
  logger.info(`     • POST /api/locators/analyze-url - Analyze webpage`);
  logger.info(`     • POST /api/locators/analyze-html - Analyze HTML content`);
  logger.info(`     • POST /api/locators/upload-html - Upload HTML file`);
  logger.info(`     • POST /api/locators/verify - Verify locator`);
  logger.info(`     • POST /api/locators/element-details - Get element details`);
  logger.info(`     • POST /api/locators/batch-analyze - Batch analysis`);
  
  // Script generation endpoints
  logger.info(`   🧪 Test Script Generation:`);
  logger.info(`     • POST /api/scripts/generate-script - Generate test script`);
  logger.info(`     • POST /api/scripts/generate-page-object - Generate page object model`);
  logger.info(`     • POST /api/scripts/generate-test-data - Generate test data`);
  logger.info(`     • POST /api/scripts/generate-test-suite - Generate complete test suite`);
  logger.info(`     • GET /api/scripts/templates - Get script templates`);
  logger.info(`     • POST /api/scripts/validate-script - Validate generated script`);
  
  logger.info(`   🏥 Health Check:`);
  logger.info(`     • GET /health - Health check`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close browser if initialized
    const browserService = require('./src/services/browserService');
    browserService.close().then(() => {
      logger.info('Browser closed');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error closing browser:', err);
      process.exit(1);
    });
  });

  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle various termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err, promise) => {
  logger.error('UNHANDLED REJECTION! 💥', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

module.exports = server;