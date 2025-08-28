// backend/src/controllers/scriptGenerationController.js
const scriptGenerationService = require('../services/scriptGenerationService');
const { validate, schemas } = require('../utils/validators');
const logger = require('../utils/logger');

class ScriptGenerationController {
  async generateTestScript(req, res, next) {
    try {
      const validatedData = validate(schemas.generateTestScript, req.body);
      const { 
        locators, 
        framework, 
        language, 
        testType, 
        testName, 
        baseUrl, 
        actions 
      } = validatedData;

      logger.info(`Generating ${framework} test script in ${language}`);
      
      const result = await scriptGenerationService.generateTestScript(locators, {
        framework,
        language,
        testType,
        testName,
        baseUrl,
        actions
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async generatePageObject(req, res, next) {
    try {
      const validatedData = validate(schemas.generatePageObject, req.body);
      const { locators, framework, language, className } = validatedData;

      logger.info(`Generating page object model for ${framework} in ${language}`);
      
      const result = await scriptGenerationService.generatePageObjectModel(locators, {
        framework,
        language,
        className
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async generateTestData(req, res, next) {
    try {
      const validatedData = validate(schemas.generateTestData, req.body);
      const { locators, testType } = validatedData;

      logger.info(`Generating test data for ${testType} test type`);
      
      const result = await scriptGenerationService.generateTestData(locators, testType);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async generateCompleteTestSuite(req, res, next) {
    try {
      const validatedData = validate(schemas.generateTestSuite, req.body);
      const { 
        locators, 
        framework, 
        language, 
        testName, 
        baseUrl, 
        actions,
        includePageObject = true,
        includeTestData = true,
        testTypes = ['basic']
      } = validatedData;

      logger.info(`Generating complete test suite for ${framework} in ${language}`);
      
      const results = {
        testScripts: [],
        pageObject: null,
        testData: null
      };

      // Generate test scripts for each test type
      for (const testType of testTypes) {
        const script = await scriptGenerationService.generateTestScript(locators, {
          framework,
          language,
          testType,
          testName: `${testName}_${testType}`,
          baseUrl,
          actions: actions.filter(action => !action.testType || action.testType === testType)
        });
        results.testScripts.push(script);
      }

      // Generate page object model if requested
      if (includePageObject) {
        results.pageObject = await scriptGenerationService.generatePageObjectModel(locators, {
          framework,
          language,
          className: `${testName}Page`
        });
      }

      // Generate test data if requested
      if (includeTestData) {
        results.testData = await scriptGenerationService.generateTestData(locators, testTypes[0]);
      }

      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async getScriptTemplates(req, res, next) {
    try {
      const { framework, language } = req.query;

      const templates = {
        selenium: {
          python: {
            basic: `# Basic Selenium Python Template
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import unittest
import time

class TestExample(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(10)
        
    def test_example(self):
        driver = self.driver
        driver.get("https://example.com")
        # Add your test steps here
        
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()`,
            pageObject: `# Page Object Model Template
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class ExamplePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
    
    # Add locators and methods here`
          },
          javascript: {
            basic: `// Basic Selenium JavaScript Template
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

describe('Example Test Suite', function() {
    let driver;
    
    before(async function() {
        driver = await new Builder().forBrowser('chrome').build();
    });
    
    it('should perform test actions', async function() {
        await driver.get('https://example.com');
        // Add your test steps here
    });
    
    after(async function() {
        await driver.quit();
    });
});`,
            pageObject: `// Page Object Model Template
class ExamplePage {
    constructor(driver) {
        this.driver = driver;
    }
    
    // Add locators and methods here
}`
          },
          java: {
            basic: `// Basic Selenium Java Template
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.testng.annotations.*;

public class ExampleTest {
    private WebDriver driver;
    
    @BeforeMethod
    public void setUp() {
        driver = new ChromeDriver();
    }
    
    @Test
    public void testExample() {
        driver.get("https://example.com");
        // Add your test steps here
    }
    
    @AfterMethod
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}`,
            pageObject: `// Page Object Model Template
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;

public class ExamplePage {
    private WebDriver driver;
    
    public ExamplePage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }
    
    // Add locators and methods here
}`
          }
        },
        playwright: {
          python: {
            basic: `# Basic Playwright Python Template
from playwright.sync_api import sync_playwright
import pytest

def test_example():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("https://example.com")
        # Add your test steps here
        browser.close()`,
            pageObject: `# Page Object Model Template
class ExamplePage:
    def __init__(self, page):
        self.page = page
    
    # Add locators and methods here`
          },
          javascript: {
            basic: `// Basic Playwright JavaScript Template
const { test, expect } = require('@playwright/test');

test.describe('Example Test Suite', () => {
    test('should perform test actions', async ({ page }) => {
        await page.goto('https://example.com');
        // Add your test steps here
    });
});`,
            pageObject: `// Page Object Model Template
class ExamplePage {
    constructor(page) {
        this.page = page;
    }
    
    // Add locators and methods here
}`
          },
          java: {
            basic: `// Basic Playwright Java Template
import com.microsoft.playwright.*;

public class ExampleTest {
    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
            page.navigate("https://example.com");
            // Add your test steps here
            browser.close();
        }
    }
}`,
            pageObject: `// Page Object Model Template
import com.microsoft.playwright.Page;

public class ExamplePage {
    private final Page page;
    
    public ExamplePage(Page page) {
        this.page = page;
    }
    
    // Add locators and methods here
}`
          }
        },
        cypress: {
          javascript: {
            basic: `// Basic Cypress JavaScript Template
describe('Example Test Suite', () => {
    beforeEach(() => {
        cy.visit('https://example.com');
    });
    
    it('should perform test actions', () => {
        // Add your test steps here
    });
});`,
            pageObject: `// Page Object Model Template
class ExamplePage {
    visit() {
        cy.visit('/');
    }
    
    // Add locators and methods here
}

export default ExamplePage;`
          },
          typescript: {
            basic: `// Basic Cypress TypeScript Template
describe('Example Test Suite', () => {
    beforeEach(() => {
        cy.visit('https://example.com');
    });
    
    it('should perform test actions', () => {
        // Add your test steps here
    });
});`,
            pageObject: `// Page Object Model Template
class ExamplePage {
    visit(): void {
        cy.visit('/');
    }
    
    // Add locators and methods here
}

export default ExamplePage;`
          }
        }
      };

      const result = framework && language ? 
        templates[framework]?.[language] || {} : 
        templates;

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async validateGeneratedScript(req, res, next) {
    try {
      const { code, framework, language } = req.body;

      if (!code || !framework || !language) {
        throw new Error('Code, framework, and language are required');
      }

      // Basic validation using Gemini
      const prompt = `
Analyze this ${framework} test automation script written in ${language} and provide feedback:

${code}

Please check for:
1. Syntax errors
2. Best practices compliance
3. Security issues
4. Performance concerns
5. Maintainability issues
6. Framework-specific recommendations

Return a JSON response with:
{
  "isValid": boolean,
  "issues": [{"type": "error|warning|info", "message": "description", "line": number}],
  "score": number (0-100),
  "recommendations": ["suggestion1", "suggestion2"]
}
      `;

      const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 1024
        }
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        const validation = JSON.parse(text);
        res.json({
          success: true,
          data: validation,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        res.json({
          success: true,
          data: {
            isValid: true,
            issues: [],
            score: 75,
            recommendations: [],
            analysis: text
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScriptGenerationController();