// backend/src/app.js - Updated to include script generation routes
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const locatorRoutes = require('./routes/locatorRoutes');
const scriptGenerationRoutes = require('./routes/scriptGenerationRoutes');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing and compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api/locators', locatorRoutes);
app.use('/api/scripts', scriptGenerationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      locatorGeneration: 'operational',
      scriptGeneration: 'operational',
      geminiApi: process.env.GEMINI_API_KEY ? 'configured' : 'missing'
    }
  });
});

// Error handling
app.use(errorHandler);

module.exports = app;