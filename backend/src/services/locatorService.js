const cheerio = require('cheerio');
const rankingService = require('./rankingService');
const parserService = require('./parserService');
const logger = require('../utils/logger');

class LocatorService {
  generateLocators(html, options = {}) {
    const $ = cheerio.load(html);
    const elements = this.findInteractiveElements($);
    const locatorResults = [];

    elements.each((index, element) => {
      const $element = $(element);
      const strategies = this.generateStrategies($element, $, options);
      
      if (strategies.length > 0) {
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

    return locatorResults;
  }

  findInteractiveElements($) {
    const interactiveSelectors = [
      'a', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[role="checkbox"]',
      '[role="radio"]', '[role="textbox"]', '[role="combobox"]',
      '[onclick]', '[ng-click]', '[data-action]'
    ];

    return $(interactiveSelectors.join(', '));
  }

  generateStrategies($element, $, options) {
    const strategies = [];
    const framework = options.framework || 'selenium';

    // ID Strategy
    if ($element.attr('id')) {
      strategies.push(this.createStrategy('id', $element.attr('id'), framework));
    }

    // Name Strategy
    if ($element.attr('name')) {
      strategies.push(this.createStrategy('name', $element.attr('name'), framework));
    }

    // Class Strategy
    const classes = $element.attr('class');
    if (classes) {
      const uniqueClass = this.findUniqueClass(classes.split(' '), $);
      if (uniqueClass) {
        strategies.push(this.createStrategy('class', uniqueClass, framework));
      }
    }

    // Data Attributes Strategy
    const dataAttrs = this.getDataAttributes($element);
    dataAttrs.forEach(attr => {
      strategies.push(this.createStrategy('data', attr, framework));
    });

    // Text Strategy
    const text = $element.text().trim();
    if (text && text.length < 50) {
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
      if (ariaLabel) {
        strategies.push(this.createStrategy('aria-label', ariaLabel, framework));
      }

      const role = $element.attr('role');
      if (role) {
        strategies.push(this.createStrategy('role', role, framework));
      }
    }

    return strategies;
  }

  createStrategy(type, value, framework) {
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
  }

  formatSelector(type, value, framework) {
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
        id: (v) => `#${v}`,
        name: (v) => `[name="${v}"]`,
        class: (v) => `.${v}`,
        css: (v) => v,
        xpath: (v) => v,
        text: (v) => `text="${v}"`,
        'aria-label': (v) => `[aria-label="${v}"]`,
        role: (v) => `[role="${v}"]`,
        data: (v) => `[${v.name}="${v.value}"]`
      },
      cypress: {
        id: (v) => `cy.get('#${v}')`,
        name: (v) => `cy.get('[name="${v}"]')`,
        class: (v) => `cy.get('.${v}')`,
        css: (v) => `cy.get('${v}')`,
        xpath: (v) => `cy.xpath('${v}')`,
        text: (v) => `cy.contains('${v}')`,
        'aria-label': (v) => `cy.get('[aria-label="${v}"]')`,
        role: (v) => `cy.get('[role="${v}"]')`,
        data: (v) => `cy.get('[${v.name}="${v.value}"]')`
      }
    };

    const formatter = formatters[framework]?.[type];
    return formatter ? formatter(value) : value;
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

    // Adjust based on value characteristics
    if (type === 'id' && /^[a-zA-Z][\w-]*$/.test(value)) {
      confidence += 0.05;
    }
    if (type === 'class' && value.split(' ').length === 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  calculateStability(type, value) {
    let stability = 0.5;

    // IDs are generally stable
    if (type === 'id') {
      stability = 0.9;
      // Reduce if ID looks auto-generated
      if (/^\d+$/.test(value) || /[a-f0-9]{8,}/.test(value)) {
        stability -= 0.3;
      }
    }

    // Data attributes are usually stable
    if (type === 'data') {
      stability = 0.8;
    }

    // Text can be unstable
    if (type === 'text') {
      stability = 0.4;
    }

    // XPath with indices is unstable
    if (type === 'xpath' && /\[\d+\]/.test(value)) {
      stability = 0.3;
    }

    return stability;
  }

  findUniqueClass(classes, $) {
    for (const cls of classes) {
      if (cls && $(`.${cls}`).length === 1) {
        return cls;
      }
    }
    return null;
  }

  getDataAttributes($element) {
    const attrs = [];
    const elementAttrs = $element[0].attribs || {};
    
    Object.keys(elementAttrs).forEach(key => {
      if (key.startsWith('data-')) {
        attrs.push({
          name: key,
          value: elementAttrs[key]
        });
      }
    });

    return attrs;
  }

  getAttributes($element) {
    const attrs = {};
    const elementAttrs = $element[0].attribs || {};
    
    Object.keys(elementAttrs).forEach(key => {
      attrs[key] = elementAttrs[key];
    });

    return attrs;
  }

  generateCssSelector($element, $) {
    const parts = [];
    let current = $element;

    while (current.length && current[0].name !== 'html') {
      let selector = current[0].name;
      
      const id = current.attr('id');
      if (id) {
        parts.unshift(`#${id}`);
        break;
      }

      const classes = current.attr('class');
      if (classes) {
        const uniqueClass = this.findUniqueClass(classes.split(' '), $);
        if (uniqueClass) {
          selector += `.${uniqueClass}`;
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
  }

  generateXPath($element, $) {
    const parts = [];
    let current = $element;

    while (current.length && current[0].name !== 'html') {
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
  }

  getElementContext($element, $) {
    const context = {
      parent: null,
      form: null,
      section: null,
      navigation: null
    };

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

    return context;
  }
}

module.exports = new LocatorService();