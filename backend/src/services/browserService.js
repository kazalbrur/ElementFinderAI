const { chromium } = require('playwright');
const config = require('../config');
const logger = require('../utils/logger');

class BrowserService {
  constructor() {
    this.browser = null;
    this.isInitializing = false;
  }

  async init() {
    if (this.browser) {
      return this.browser;
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.browser;
    }

    this.isInitializing = true;

    try {
      const launchOptions = {
        headless: config.playwright.headless,
        ...config.playwright.browser
      };

      // Add environment-specific options
      if (process.env.NODE_ENV === 'production') {
        launchOptions.args = [
          ...launchOptions.args,
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ];
      }

      logger.info('Initializing browser with options:', launchOptions);
      this.browser = await chromium.launch(launchOptions);
      logger.info('Browser initialized successfully');
      
      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        logger.warn('Browser disconnected');
        this.browser = null;
      });

    } catch (error) {
      logger.error('Browser initialization failed:', error);
      
      // Provide helpful error messages
      if (error.message.includes('Executable doesn\'t exist')) {
        throw new Error(
          'Playwright browsers not found. Please run: npx playwright install'
        );
      }
      
      if (error.message.includes('Permission denied')) {
        throw new Error(
          'Browser permission denied. Try: sudo npx playwright install-deps'
        );
      }
      
      throw error;
    } finally {
      this.isInitializing = false;
    }

    return this.browser;
  }

  async fetchPageContent(url, options = {}) {
    const browser = await this.init();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      ...options.contextOptions
    });
    
    const page = await context.newPage();

    try {
      logger.info(`Fetching page content: ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.playwright.navigationTimeout
      });

      // Wait for dynamic content
      await page.waitForTimeout(options.waitTime || 2000);

      // Optionally wait for specific selector
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: 10000
        });
      }

      // Get the HTML content
      const html = await page.content();
      logger.info(`Successfully fetched ${html.length} characters from ${url}`);

      await context.close();
      return html;

    } catch (error) {
      logger.error(`Error fetching page content from ${url}:`, error);
      await context.close();
      
      // Provide more specific error messages
      if (error.name === 'TimeoutError') {
        throw new Error(`Page load timeout: ${url} took longer than ${config.playwright.navigationTimeout}ms`);
      }
      
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        throw new Error(`Cannot resolve domain: ${url}. Please check the URL.`);
      }
      
      if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        throw new Error(`Connection refused: ${url} is not accessible.`);
      }
      
      throw error;
    }
  }

  async verifyLocator(url, locator, framework, options = {}) {
    const browser = await this.init();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      logger.info(`Verifying locator on ${url}: ${locator}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.playwright.navigationTimeout
      });

      let element;
      let count = 0;

      switch (framework) {
        case 'playwright':
          element = await page.locator(locator);
          count = await element.count();
          break;
          
        case 'selenium':
        case 'cypress':
          // Convert to CSS or XPath based on locator type
          const selector = this.convertLocator(locator, framework);
          element = await page.locator(selector);
          count = await element.count();
          break;
          
        default:
          throw new Error(`Unsupported framework: ${framework}`);
      }

      const result = {
        found: count > 0,
        count,
        isUnique: count === 1
      };

      if (count > 0) {
        const firstElement = element.first();
        result.isVisible = await firstElement.isVisible();
        result.isEnabled = await firstElement.isEnabled();
        
        // Get additional element info
        try {
          const boundingBox = await firstElement.boundingBox();
          result.boundingBox = boundingBox;
          
          const innerHTML = await firstElement.innerHTML();
          result.innerHTML = innerHTML.substring(0, 200); // Limit size
          
        } catch (err) {
          logger.warn('Could not get additional element info:', err.message);
        }
      }

      await context.close();
      logger.info(`Verification result for ${locator}:`, result);
      return result;

    } catch (error) {
      logger.error(`Error verifying locator ${locator}:`, error);
      await context.close();
      throw error;
    }
  }

  async getElementDetails(url, selector, options = {}) {
    const browser = await this.init();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      logger.info(`Getting element details for ${selector} on ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.playwright.navigationTimeout
      });

      const element = await page.locator(selector).first();
      
      if (await element.count() === 0) {
        throw new Error(`Element not found: ${selector}`);
      }

      const details = await element.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          text: el.textContent?.trim(),
          value: el.value || null,
          href: el.href || null,
          src: el.src || null,
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          position: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          styles: {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            position: styles.position,
            color: styles.color,
            backgroundColor: styles.backgroundColor
          },
          isInteractive: ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'].includes(el.tagName.toLowerCase()),
          isFormElement: ['input', 'select', 'textarea', 'button'].includes(el.tagName.toLowerCase())
        };
      });

      await context.close();
      logger.info('Successfully retrieved element details');
      return details;

    } catch (error) {
      logger.error(`Error getting element details for ${selector}:`, error);
      await context.close();
      throw error;
    }
  }

  convertLocator(locator, framework) {
    // Enhanced conversion logic
    try {
      if (framework === 'selenium') {
        // Handle various Selenium locator formats
        if (locator.match(/^By\.id\(['"](.+)['"]\)$/)) {
          const id = locator.match(/^By\.id\(['"](.+)['"]\)$/)[1];
          return `#${id}`;
        }
        if (locator.match(/^By\.className\(['"](.+)['"]\)$/)) {
          const className = locator.match(/^By\.className\(['"](.+)['"]\)$/)[1];
          return `.${className}`;
        }
        if (locator.match(/^By\.cssSelector\(['"](.+)['"]\)$/)) {
          const css = locator.match(/^By\.cssSelector\(['"](.+)['"]\)$/)[1];
          return css;
        }
        if (locator.match(/^By\.xpath\(['"](.+)['"]\)$/)) {
          const xpath = locator.match(/^By\.xpath\(['"](.+)['"]\)$/)[1];
          return xpath;
        }
        if (locator.match(/^By\.name\(['"](.+)['"]\)$/)) {
          const name = locator.match(/^By\.name\(['"](.+)['"]\)$/)[1];
          return `[name="${name}"]`;
        }
      }
      
      if (framework === 'cypress') {
        // Handle Cypress locator formats
        if (locator.match(/^cy\.get\(['"](.+)['"]\)$/)) {
          const selector = locator.match(/^cy\.get\(['"](.+)['"]\)$/)[1];
          return selector;
        }
        if (locator.match(/^cy\.contains\(['"](.+)['"]\)$/)) {
          const text = locator.match(/^cy\.contains\(['"](.+)['"]\)$/)[1];
          return `text="${text}"`;
        }
      }
      
      // If no conversion needed, return as-is
      return locator;
      
    } catch (error) {
      logger.warn(`Could not convert locator ${locator} for ${framework}:`, error.message);
      return locator;
    }
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        logger.info('Browser closed successfully');
      } catch (error) {
        logger.error('Error closing browser:', error);
      }
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const browser = await this.init();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('data:text/html,<html><body>Health Check</body></html>');
      const title = await page.title();
      
      await context.close();
      
      return {
        status: 'healthy',
        browserVersion: browser.version(),
        canNavigate: title !== null
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new BrowserService();