const locatorService = require('../services/locatorService');
const browserService = require('../services/browserService');
const geminiService = require('../services/geminiService');
const { validate, schemas } = require('../utils/validators');
const logger = require('../utils/logger');
const fs = require('fs').promises;

class LocatorController {
  async analyzeUrl(req, res, next) {
    try {
      const validatedData = validate(schemas.analyzeUrl, req.body);
      const { url, framework, includeAccessibility } = validatedData;

      logger.info(`Analyzing URL: ${url}`);
      
      const html = await browserService.fetchPageContent(url);
      const locators = await locatorService.generateLocators(html, {
        url,
        framework,
        includeAccessibility
      });

      res.json({
        success: true,
        data: {
          url,
          framework,
          locators,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async analyzeHtml(req, res, next) {
    try {
      const validatedData = validate(schemas.analyzeHtml, req.body);
      const { html, framework, includeAccessibility } = validatedData;

      const locators = await locatorService.generateLocators(html, {
        framework,
        includeAccessibility
      });

      res.json({
        success: true,
        data: {
          framework,
          locators,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadHtml(req, res, next) {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const html = await fs.readFile(req.file.path, 'utf8');
      await fs.unlink(req.file.path); // Clean up uploaded file

      const { framework = 'selenium', includeAccessibility = true } = req.body;

      const locators = await locatorService.generateLocators(html, {
        framework,
        includeAccessibility
      });

      res.json({
        success: true,
        data: {
          filename: req.file.originalname,
          framework,
          locators,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyLocator(req, res, next) {
    try {
      const validatedData = validate(schemas.verifyLocator, req.body);
      const { locator, url, framework } = validatedData;

      // Verify with browser
      const browserResult = await browserService.verifyLocator(url, locator, framework);
      
      // Verify with Gemini AI
      const aiVerification = await geminiService.verifyLocator(locator, framework);

      res.json({
        success: true,
        data: {
          locator,
          browserVerification: browserResult,
          aiVerification,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getElementDetails(req, res, next) {
    try {
      const { url, selector } = req.body;

      if (!url || !selector) {
        throw new Error('URL and selector are required');
      }

      const details = await browserService.getElementDetails(url, selector);

      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      next(error);
    }
  }

  async batchAnalyze(req, res, next) {
    try {
      const { urls, framework = 'selenium' } = req.body;

      if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('URLs array is required');
      }

      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            const html = await browserService.fetchPageContent(url);
            const locators = await locatorService.generateLocators(html, {
              url,
              framework
            });
            return { url, success: true, locators };
          } catch (error) {
            return { url, success: false, error: error.message };
          }
        })
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LocatorController();
