const express = require('express');
const multer = require('multer');
const locatorController = require('../controllers/locatorController');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Analyze URL
router.post('/analyze-url', cacheMiddleware, locatorController.analyzeUrl);

// Analyze HTML content
router.post('/analyze-html', locatorController.analyzeHtml);

// Upload HTML file
router.post('/upload-html', upload.single('file'), locatorController.uploadHtml);

// Verify locator
router.post('/verify', locatorController.verifyLocator);

// Get element details
router.post('/element-details', locatorController.getElementDetails);

// Batch analysis
router.post('/batch-analyze', locatorController.batchAnalyze);

module.exports = router;