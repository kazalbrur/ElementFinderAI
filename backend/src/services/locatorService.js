const cheerio = require('cheerio');
const rankingService = require('./rankingService');
const parserService = require('./parserService');
const logger = require('../utils/logger');

class LocatorService {
  generateLocators(html, options = {}) {
    try {
      const $ = cheerio.load(html);
      const elements = this.findInteractiveElements($);
      const locatorResults = [];

      logger.info(`Found ${elements.length} interactive elements`);

      elements.each((index, element) => {
        const $element = $(element);
        const strategies = this.generateStrategies($element, $, options);
        
        if (strategies.length > 0) {
          // Pass the $ object to rankingService
          const rankedStrategies = rankingService.rankStrategies(strategies, $element, $);
          
          locatorResults.push({
            element: {
              tag: element.name,
              text: $element.text().trim().substring(0, 50),
              attributes: this.getAttributes($element)
            },
            strategies: rankedStrategies,
            context: this.getElementContext($element, $)
          });
        }
      });

      logger.info(`Generated locators for ${locatorResults.length} elements`);
      return locatorResults;

    } catch (error) {
      logger.error('Error generating locators:', error);
      throw new Error(`Failed to generate locators: ${error.message}`);
    }
  }

  findInteractiveElements($) {
    const interactiveSelectors = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="checkbox"]',
      '[role="radio"]', '[role="textbox"]', '[role="combobox"]',
      '[onclick]', '[ng-click]', '[data-action]', '[data-testid]'
    ];

    return $(interactiveSelectors.join(', '));
  }

  generateStrategies($element, $, options) {
    const strategies = [];
    const framework = options.framework || 'selenium';

    try {
      // ID Strategy
      const id = $element.attr('id');
      if (id && id.trim()) {
        strategies.push(this.createStrategy('id', id.trim(), framework));
      }

      // Name Strategy
      const name = $element.attr('name');
      if (name && name.trim()) {
        strategies.push(this.createStrategy('name', name.trim(), framework));
      }

      // Class Strategy
      const classes = $element.attr('class');
      if (classes) {
        const uniqueClass = this.findUniqueClass(classes.split(/\s+/), $);
        if (uniqueClass) {
          strategies.push(this.createStrategy('class', uniqueClass, framework));
        }
      }

      // Data Attributes Strategy
      const dataAttrs = this.getDataAttributes($element);
      dataAttrs.forEach(attr => {
        if (attr.name && attr.value) {
          strategies.push(this.createStrategy('data', attr, framework));
        }
      });

      // Text Strategy
      const text = $element.text().trim();
      if (text && text.length > 0 && text.length < 50) {
        strategies.push(this.createStrategy('text', text, framework));
      }

      // CSS Selector Strategy
      const cssSelector = this.generateCssSelector($element, $);
      if (cssSelector) {
        strategies.push(this.createStrategy('css', cssSelector, framework));
      }

      // XPath Strategy
      const xpath = this.generateXPath($element, $);
      if (xpath) {
        strategies.push(this.createStrategy('xpath', xpath, framework));
      }

      // Accessibility Strategy
      if (options.includeAccessibility) {
        const ariaLabel = $element.attr('aria-label');
        if (ariaLabel && ariaLabel.trim()) {
          strategies.push(this.createStrategy('aria-label', ariaLabel.trim(), framework));
        }

        const role = $element.attr('role');
        if (role && role.trim()) {
          strategies.push(this.createStrategy('role', role.trim(), framework));
        }
      }

      logger.debug(`Generated ${strategies.length} strategies for element:`, $element[0].name);
      return strategies;

    } catch (error) {
      logger.error('Error generating strategies:', error);
      return [];
    }
  }

  createStrategy(type, value, framework) {
    try {
      const strategy = {
        type,
        value,
        selector: this.formatSelector(type, value, framework),
        confidence: 0,
        stability: 0
      };

      // Calculate initial confidence and stability
      strategy.confidence = this.calculateConfidence(type, value);
      strategy.stability = this.calculateStability(type, value);

      return strategy;
    } catch (error) {
      logger.error(`Error creating strategy for type ${type}:`, error);
      return null;
    }
  }

  formatSelector(type, value, framework) {
    try {
      const formatters = {
        selenium: {
          id: (v) => `By.id("${v}")`,
          name: (v) => `By.name("${v}")`,
          class: (v) => `By.className("${v}")`,
          css: (v) => `By.cssSelector("${v}")`,
          xpath: (v) => `By.xpath("${v}")`,
          text: (v) => `By.linkText("${v}")`,
          'aria-label': (v) => `By.cssSelector("[aria-label='${v}']")`,
          role: (v) => `By.cssSelector("[role='${v}']")`,
          data: (v) => `By.cssSelector("[${v.name}='${v.value}']")`
        },
        playwright: {
          id: (v) => `page.locator('#${this.escapeSelector(v)}')`,
          name: (v) => `page.locator('[name="${this.escapeSelector(v)}"]')`,
          class: (v) => `page.locator('.${this.escapeSelector(v)}')`,
          css: (v) => `page.locator('${v}')`,
          xpath: (v) => `page.locator('xpath=${v}')`,
          text: (v) => `page.getByText('${this.escapeSelector(v)}')`,
          'aria-label': (v) => `page.getByLabel('${this.escapeSelector(v)}')`,
          role: (v) => `page.getByRole('${v}')`,
          data: (v) => `page.locator('[${v.name}="${this.escapeSelector(v.value)}"]')`
        },
        cypress: {
          id: (v) => `cy.get('#${this.escapeSelector(v)}')`,
          name: (v) => `cy.get('[name="${this.escapeSelector(v)}"]')`,
          class: (v) => `cy.get('.${this.escapeSelector(v)}')`,
          css: (v) => `cy.get('${v}')`,
          xpath: (v) => `cy.xpath('${v}')`,
          text: (v) => `cy.contains('${this.escapeSelector(v)}')`,
          'aria-label': (v) => `cy.get('[aria-label="${this.escapeSelector(v)}"]')`,
          role: (v) => `cy.get('[role="${v}"]')`,
          data: (v) => `cy.get('[${v.name}="${this.escapeSelector(v.value)}"]')`
        }
      };

      const formatter = formatters[framework]?.[type];
      if (!formatter) {
        logger.warn(`No formatter found for framework: ${framework}, type: ${type}`);
        return String(value);
      }

      return formatter(value);
    } catch (error) {
      logger.error(`Error formatting selector for ${type}:`, error);
      return String(value);
    }
  }

  escapeSelector(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/['"\\]/g, '\\$&');
  }

  calculateConfidence(type, value) {
    const confidenceScores = {
      id: 0.95,
      name: 0.85,
      'aria-label': 0.80,
      data: 0.75,
      class: 0.70,
      role: 0.65,
      css: 0.60,
      xpath: 0.55,
      text: 0.50
    };

    let confidence = confidenceScores[type] || 0.5;

    try {
      // Adjust based on value characteristics
      if (type === 'id' && typeof value === 'string' && /^[a-zA-Z][\w-]*$/.test(value)) {
        confidence += 0.05;
      }
      if (type === 'class' && typeof value === 'string' && !value.includes(' ')) {
        confidence += 0.1;
      }
      if (type === 'data' && value.name && value.name.includes('test')) {
        confidence += 0.1;
      }
    } catch (error) {
      logger.warn(`Error calculating confidence for ${type}:`, error);
    }

    return Math.min(confidence, 1.0);
  }

  calculateStability(type, value) {
    let stability = 0.5;

    try {
      // IDs are generally stable
      if (type === 'id') {
        stability = 0.9;
        if (typeof value === 'string') {
          // Reduce if ID looks auto-generated
          if (/^\d+$/.test(value) || /[a-f0-9]{8,}/.test(value)) {
            stability -= 0.3;
          }
        }
      }

      // Data attributes are usually stable
      if (type === 'data') {
        stability = 0.8;
        if (value.name && value.name.includes('test')) {
          stability += 0.1;
        }
      }

      // Text can be unstable
      if (type === 'text') {
        stability = 0.4;
      }

      // XPath with indices is unstable
      if (type === 'xpath' && typeof value === 'string' && /\[\d+\]/.test(value)) {
        stability = 0.3;
      }
    } catch (error) {
      logger.warn(`Error calculating stability for ${type}:`, error);
    }

    return Math.max(0, Math.min(1, stability));
  }

  findUniqueClass(classes, $) {
    try {
      for (const cls of classes) {
        if (cls && cls.trim() && $(`.${cls.trim()}`).length === 1) {
          return cls.trim();
        }
      }
    } catch (error) {
      logger.warn('Error finding unique class:', error);
    }
    return null;
  }

  getDataAttributes($element) {
    const attrs = [];
    try {
      const elementAttrs = $element[0].attribs || {};
      
      Object.keys(elementAttrs).forEach(key => {
        if (key.startsWith('data-') && elementAttrs[key]) {
          attrs.push({
            name: key,
            value: elementAttrs[key]
          });
        }
      });
    } catch (error) {
      logger.warn('Error getting data attributes:', error);
    }

    return attrs;
  }

  getAttributes($element) {
    const attrs = {};
    try {
      const elementAttrs = $element[0].attribs || {};
      
      Object.keys(elementAttrs).forEach(key => {
        attrs[key] = elementAttrs[key];
      });
    } catch (error) {
      logger.warn('Error getting attributes:', error);
    }

    return attrs;
  }

  generateCssSelector($element, $) {
    try {
      const parts = [];
      let current = $element;

      while (current.length && current[0].name !== 'html' && parts.length < 5) {
        let selector = current[0].name;
        
        const id = current.attr('id');
        if (id) {
          parts.unshift(`#${id}`);
          break;
        }

        const classes = current.attr('class');
        if (classes) {
          const classList = classes.split(/\s+/).filter(cls => cls.trim());
          const uniqueClass = this.findUniqueClass(classList, $);
          if (uniqueClass) {
            selector += `.${uniqueClass}`;
          } else if (classList.length > 0) {
            selector += `.${classList[0]}`;
          }
        }

        const siblings = current.siblings(current[0].name);
        if (siblings.length > 0) {
          const index = current.index() + 1;
          selector += `:nth-child(${index})`;
        }

        parts.unshift(selector);
        current = current.parent();
      }

      return parts.join(' > ');
    } catch (error) {
      logger.warn('Error generating CSS selector:', error);
      return null;
    }
  }

  generateXPath($element, $) {
    try {
      const parts = [];
      let current = $element;

      while (current.length && current[0].name !== 'html' && parts.length < 10) {
        let xpath = current[0].name;
        
        const id = current.attr('id');
        if (id) {
          return `//*[@id="${id}"]`;
        }

        const classes = current.attr('class');
        if (classes) {
          xpath += `[@class="${classes}"]`;
        }

        const siblings = current.siblings(current[0].name);
        if (siblings.length > 0) {
          const index = current.index() + 1;
          xpath += `[${index}]`;
        }

        parts.unshift(xpath);
        current = current.parent();
      }

      return '//' + parts.join('/');
    } catch (error) {
      logger.warn('Error generating XPath:', error);
      return null;
    }
  }

  getElementContext($element, $) {
    const context = {
      parent: null,
      form: null,
      section: null,
      navigation: null
    };

    try {
      // Get parent context
      const parent = $element.parent();
      if (parent.length) {
        context.parent = {
          tag: parent[0].name,
          id: parent.attr('id'),
          class: parent.attr('class')
        };
      }

      // Check if element is in a form
      const form = $element.closest('form');
      if (form.length) {
        context.form = {
          id: form.attr('id'),
          name: form.attr('name'),
          action: form.attr('action')
        };
      }

      // Check for section context
      const section = $element.closest('section, article, main, aside');
      if (section.length) {
        context.section = {
          tag: section[0].name,
          id: section.attr('id'),
          class: section.attr('class')
        };
      }

      // Check for navigation context
      const nav = $element.closest('nav, [role="navigation"]');
      if (nav.length) {
        context.navigation = true;
      }
    } catch (error) {
      logger.warn('Error getting element context:', error);
    }

    return context;
  }
}

module.exports = new LocatorService();