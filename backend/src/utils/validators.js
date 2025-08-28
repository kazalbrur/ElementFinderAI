// backend/src/utils/validators.js - Updated with script generation schemas
const Joi = require('joi');

const locatorSchema = Joi.object({
  element: Joi.object({
    tag: Joi.string().required(),
    text: Joi.string().allow(''),
    attributes: Joi.object().default({})
  }).required(),
  strategies: Joi.array().items(
    Joi.object({
      type: Joi.string().required(),
      selector: Joi.string().required(),
      totalScore: Joi.number().min(0).max(1),
      scores: Joi.object().optional()
    })
  ).required(),
  context: Joi.object().optional()
});

const actionSchema = Joi.object({
  type: Joi.string().valid(
    'navigate', 'click', 'type', 'select', 'submit', 'wait', 'assert', 'hover', 'scroll'
  ).required(),
  element: Joi.string().optional(),
  value: Joi.string().optional(),
  description: Joi.string().optional(),
  testType: Joi.string().optional()
});

const schemas = {
  // Existing schemas
  analyzeUrl: Joi.object({
    url: Joi.string().uri().required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').default('selenium'),
    includeAccessibility: Joi.boolean().default(true)
  }),
  
  analyzeHtml: Joi.object({
    html: Joi.string().min(10).required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').default('selenium'),
    includeAccessibility: Joi.boolean().default(true)
  }),
  
  verifyLocator: Joi.object({
    locator: Joi.string().required(),
    url: Joi.string().uri().required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').required()
  }),

  // New script generation schemas
  generateTestScript: Joi.object({
    locators: Joi.array().items(locatorSchema).min(1).required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').default('selenium'),
    language: Joi.string().valid('python', 'javascript', 'java', 'typescript').default('python'),
    testType: Joi.string().valid(
      'basic', 'login', 'form', 'navigation', 'search', 'api', 'integration', 'e2e'
    ).default('basic'),
    testName: Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).default('GeneratedTest'),
    baseUrl: Joi.string().uri().optional(),
    actions: Joi.array().items(actionSchema).default([])
  }),

  generatePageObject: Joi.object({
    locators: Joi.array().items(locatorSchema).min(1).required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').default('selenium'),
    language: Joi.string().valid('python', 'javascript', 'java', 'typescript').default('python'),
    className: Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).default('PageObject')
  }),

  generateTestData: Joi.object({
    locators: Joi.array().items(locatorSchema).min(1).required(),
    testType: Joi.string().valid(
      'basic', 'login', 'form', 'navigation', 'search', 'registration', 'checkout'
    ).default('basic')
  }),

  generateTestSuite: Joi.object({
    locators: Joi.array().items(locatorSchema).min(1).required(),
    framework: Joi.string().valid('selenium', 'playwright', 'cypress').default('selenium'),
    language: Joi.string().valid('python', 'javascript', 'java', 'typescript').default('python'),
    testName: Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).default('TestSuite'),
    baseUrl: Joi.string().uri().optional(),
    actions: Joi.array().items(actionSchema).default([]),
    includePageObject: Joi.boolean().default(true),
    includeTestData: Joi.boolean().default(true),
    testTypes: Joi.array().items(
      Joi.string().valid('basic', 'login', 'form', 'navigation', 'search', 'api', 'integration', 'e2e')
    ).default(['basic'])
  })
};

const validate = (schema, data) => {
  const result = schema.validate(data);
  if (result.error) {
    throw new Error(result.error.details[0].message);
  }
  return result.value;
};

module.exports = { schemas, validate };