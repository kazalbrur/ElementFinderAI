const Joi = require('joi');

const schemas = {
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