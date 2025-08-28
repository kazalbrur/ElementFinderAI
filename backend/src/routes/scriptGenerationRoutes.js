// backend/src/routes/scriptGenerationRoutes.js
const express = require('express');
const scriptGenerationController = require('../controllers/scriptGenerationController');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Generate test script from locators
router.post('/generate-script', scriptGenerationController.generateTestScript);

// Generate page object model
router.post('/generate-page-object', scriptGenerationController.generatePageObject);

// Generate test data
router.post('/generate-test-data', scriptGenerationController.generateTestData);

// Generate complete test suite
router.post('/generate-test-suite', scriptGenerationController.generateCompleteTestSuite);

// Get script templates
router.get('/templates', cacheMiddleware, scriptGenerationController.getScriptTemplates);

// Validate generated script
router.post('/validate-script', scriptGenerationController.validateGeneratedScript);

module.exports = router;