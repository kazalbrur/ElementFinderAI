const { chromium } = require('playwright');
const config = require('../config');
const logger = require('../utils/logger');

class BrowserService {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: config.playwright.headless
      });
      logger.info('Browser initialized');
    }
    return this.browser;
  }

  async fetchPageContent(url) {
    const browser = await this.init();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.playwright.navigationTimeout
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Get the HTML content
      const html = await page.content();

      await context.close();
      return html;
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  async verifyLocator(url, locator, framework) {
    const browser = await this.init();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
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
      }

      const isVisible = count > 0 ? await element.first().isVisible() : false;
      const isEnabled = count > 0 ? await element.first().isEnabled() : false;

      await context.close();

      return {
        found: count > 0,
        count,
        isVisible,
        isEnabled,
        isUnique: count === 1
      };
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  async getElementDetails(url, selector) {
    const browser = await this.init();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.playwright.navigationTimeout
      });

      const element = await page.locator(selector).first();
      
      if (await element.count() === 0) {
        throw new Error('Element not found');
      }

      const details = await element.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          text: el.textContent?.trim(),
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          styles: {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex
          },
          isInteractive: ['a', 'button', 'input', 'select', 'textarea'].includes(el.tagName.toLowerCase())
        };
      });

      await context.close();
      return details;
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  convertLocator(locator, framework) {
    // Simple conversion logic - can be enhanced
    if (framework === 'selenium') {
      if (locator.startsWith('By.id')) {
        return `#${locator.replace(/By\.id\(['"](.+)['"]\)/, '$1')}`;
      }
      if (locator.startsWith('By.className')) {
        return `.${locator.replace(/By\.className\(['"](.+)['"]\)/, '$1')}`;
      }
    }
    return locator;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

module.exports = new BrowserService();