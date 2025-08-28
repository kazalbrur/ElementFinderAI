/ backend/src/services/scriptGenerationService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class ScriptGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateTestScript(locators, options = {}) {
    const {
      framework = 'selenium',
      language = 'python',
      testType = 'basic',
      testName = 'GeneratedTest',
      baseUrl = '',
      actions = []
    } = options;

    try {
      const prompt = this.buildPrompt(locators, framework, language, testType, testName, baseUrl, actions);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 4096
        }
      });

      const response = await result.response;
      const generatedCode = response.text();

      return {
        success: true,
        code: generatedCode,
        framework,
        language,
        testType,
        metadata: {
          elementsCount: locators.length,
          actionsCount: actions.length,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error generating test script:', error);
      throw new Error(`Failed to generate test script: ${error.message}`);
    }
  }

  buildPrompt(locators, framework, language, testType, testName, baseUrl, actions) {
    const frameworkTemplates = {
      selenium: this.getSeleniumTemplate(language),
      playwright: this.getPlaywrightTemplate(language),
      cypress: this.getCypressTemplate(language)
    };

    const template = frameworkTemplates[framework] || frameworkTemplates.selenium;

    return `
Generate a comprehensive ${framework} test automation script in ${language} with the following requirements:

**Test Configuration:**
- Framework: ${framework}
- Language: ${language}
- Test Type: ${testType}
- Test Name: ${testName}
- Base URL: ${baseUrl || 'https://example.com'}

**Available Elements and Locators:**
${this.formatLocatorsForPrompt(locators)}

**Test Actions to Implement:**
${actions.length > 0 ? this.formatActionsForPrompt(actions) : this.getDefaultActions(testType)}

**Requirements:**
1. Follow ${framework} best practices for ${language}
2. Include proper setup and teardown
3. Add appropriate waits and error handling
4. Include assertions for validation
5. Use the provided locators with confidence scores
6. Add comments explaining each step
7. Follow naming conventions for ${language}
8. Include imports and dependencies
9. Make the code production-ready
10. Add logging where appropriate

**Code Structure:**
${template}

**Additional Guidelines:**
- Prefer high-confidence locators (score > 0.8)
- Include fallback strategies for critical elements
- Add meaningful test data where needed
- Implement proper page object pattern if applicable
- Include both positive and negative test scenarios
- Add data-driven test capabilities where relevant

Generate a complete, runnable test script that demonstrates professional test automation practices.
    `;
  }

  formatLocatorsForPrompt(locators) {
    if (!Array.isArray(locators) || locators.length === 0) {
      return 'No locators provided';
    }

    return locators.map((element, index) => {
      const bestStrategy = element.strategies[0] || {};
      const elementInfo = element.element || {};
      
      return `
Element ${index + 1}: ${elementInfo.tag || 'unknown'}
- Description: ${elementInfo.text || 'No text'}
- Best Locator: ${bestStrategy.selector || 'No selector'}
- Type: ${bestStrategy.type || 'unknown'}
- Confidence: ${bestStrategy.totalScore || 0}
- Alternative Strategies:
${element.strategies.slice(1, 3).map(s => `  - ${s.selector} (${s.type}, confidence: ${s.totalScore})`).join('\n')}
      `.trim();
    }).join('\n\n');
  }

  formatActionsForPrompt(actions) {
    return actions.map((action, index) => {
      return `${index + 1}. ${action.type}: ${action.description || action.element || action.value || ''}`;
    }).join('\n');
  }

  getDefaultActions(testType) {
    const defaultActions = {
      basic: [
        'Navigate to the target page',
        'Verify page loads correctly',
        'Interact with key elements',
        'Validate expected results'
      ],
      login: [
        'Navigate to login page',
        'Enter username',
        'Enter password',
        'Click login button',
        'Verify successful login'
      ],
      form: [
        'Navigate to form page',
        'Fill required fields',
        'Submit form',
        'Verify form submission',
        'Check validation messages'
      ],
      navigation: [
        'Navigate to home page',
        'Click navigation links',
        'Verify page transitions',
        'Check breadcrumbs',
        'Test back/forward navigation'
      ],
      search: [
        'Navigate to search page',
        'Enter search query',
        'Submit search',
        'Verify search results',
        'Test search filters'
      ]
    };

    return (defaultActions[testType] || defaultActions.basic)
      .map((action, index) => `${index + 1}. ${action}`)
      .join('\n');
  }

  getSeleniumTemplate(language) {
    const templates = {
      python: `
# Python Selenium Template Structure
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import unittest
import time

class TestClass(unittest.TestCase):
    def setUp(self):
        # Setup WebDriver
        
    def test_method(self):
        # Test implementation
        
    def tearDown(self):
        # Cleanup
        
if __name__ == "__main__":
    unittest.main()
      `,
      javascript: `
// JavaScript Selenium Template Structure
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Test Suite', function() {
    let driver;
    
    before(async function() {
        // Setup driver
    });
    
    it('should perform test actions', async function() {
        // Test implementation
    });
    
    after(async function() {
        // Cleanup
    });
});
      `,
      java: `
// Java Selenium Template Structure
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.*;

public class TestClass {
    private WebDriver driver;
    private WebDriverWait wait;
    
    @BeforeMethod
    public void setUp() {
        // Setup WebDriver
    }
    
    @Test
    public void testMethod() {
        // Test implementation
    }
    
    @AfterMethod
    public void tearDown() {
        // Cleanup
    }
}
      `
    };
    return templates[language] || templates.python;
  }

  getPlaywrightTemplate(language) {
    const templates = {
      python: `
# Python Playwright Template Structure
from playwright.sync_api import sync_playwright
import pytest

def test_playwright():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # Test implementation
        browser.close()
      `,
      javascript: `
// JavaScript Playwright Template Structure
const { test, expect } = require('@playwright/test');

test.describe('Test Suite', () => {
    test('should perform test actions', async ({ page }) => {
        // Test implementation
    });
});
      `,
      java: `
// Java Playwright Template Structure
import com.microsoft.playwright.*;

public class TestClass {
    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
            // Test implementation
            browser.close();
        }
    }
}
      `
    };
    return templates[language] || templates.python;
  }

  getCypressTemplate(language) {
    const templates = {
      javascript: `
// Cypress Template Structure
describe('Test Suite', () => {
    beforeEach(() => {
        // Setup
    });
    
    it('should perform test actions', () => {
        // Test implementation
    });
    
    afterEach(() => {
        // Cleanup
    });
});
      `,
      typescript: `
// TypeScript Cypress Template Structure
describe('Test Suite', () => {
    beforeEach(() => {
        // Setup
    });
    
    it('should perform test actions', () => {
        // Test implementation
    });
    
    afterEach(() => {
        // Cleanup
    });
});
      `
    };
    return templates[language] || templates.javascript;
  }

  async generatePageObjectModel(locators, options = {}) {
    const { framework = 'selenium', language = 'python', className = 'PageObject' } = options;

    try {
      const prompt = `
Generate a Page Object Model class in ${language} for ${framework} framework using these locators:

${this.formatLocatorsForPrompt(locators)}

Requirements:
- Class name: ${className}
- Include constructor/initialization
- Create methods for each interactive element
- Add proper documentation
- Follow ${framework} best practices for ${language}
- Include helper methods for common actions
- Add proper error handling
- Use appropriate design patterns

Make it production-ready and well-documented.
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      });

      const response = await result.response;
      return {
        success: true,
        code: response.text(),
        className,
        framework,
        language
      };

    } catch (error) {
      logger.error('Error generating page object model:', error);
      throw new Error(`Failed to generate page object model: ${error.message}`);
    }
  }

  async generateTestData(locators, testType = 'basic') {
    try {
      const prompt = `
Generate test data for automated testing based on these form elements and their locators:

${this.formatLocatorsForPrompt(locators)}

Test Type: ${testType}

Requirements:
- Generate realistic test data
- Include both valid and invalid data sets
- Cover edge cases and boundary conditions
- Format as JSON
- Include positive and negative test scenarios
- Add data descriptions and expected outcomes

Return structured test data that can be used in data-driven tests.
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 3,
          topP: 0.9,
          maxOutputTokens: 1024
        }
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        return {
          success: true,
          data: JSON.parse(text),
          testType
        };
      } catch (parseError) {
        return {
          success: true,
          data: text,
          testType,
          note: 'Generated as text, manual parsing may be needed'
        };
      }

    } catch (error) {
      logger.error('Error generating test data:', error);
      throw new Error(`Failed to generate test data: ${error.message}`);
    }
  }
}

module.exports = new ScriptGenerationService();