const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async analyzeLocatorStrategies(html, framework = 'selenium') {
    try {
      const prompt = `
        As a test automation expert, analyze this HTML and generate robust element locators for the ${framework} framework.
        
        Focus on:
        1. Interactive elements (buttons, links, inputs, etc.)
        2. Unique and stable locators
        3. Accessibility-friendly selectors
        4. Framework-specific best practices
        
        HTML Content:
        ${html.substring(0, 5000)}...
        
        Return a JSON response with locator strategies, confidence scores, and recommendations.
        Format: {
          "elements": [
            {
              "description": "element description",
              "strategies": [
                {
                  "type": "id|css|xpath|text",
                  "selector": "actual selector",
                  "confidence": 0.9,
                  "reasoning": "why this selector is good"
                }
              ]
            }
          ],
          "recommendations": ["general advice"]
        }
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        logger.warn('Failed to parse Gemini response as JSON, returning raw text');
        return { analysis: text };
      }
    } catch (error) {
      logger.error('Gemini API error:', error);
      throw new Error('Failed to analyze with Gemini AI');
    }
  }

  async verifyLocator(locator, framework) {
    try {
      const prompt = `
        As a test automation expert, analyze this ${framework} locator for quality and reliability:
        
        Locator: ${locator}
        Framework: ${framework}
        
        Evaluate:
        1. Uniqueness and specificity
        2. Stability (likelihood to break with UI changes)
        3. Performance implications
        4. Best practices compliance
        5. Accessibility considerations
        
        Return a JSON response with:
        {
          "score": 0.85,
          "strengths": ["list of strengths"],
          "weaknesses": ["list of potential issues"],
          "suggestions": ["improvement suggestions"],
          "classification": "excellent|good|fair|poor"
        }
      `;

      const result = await this.model.generateContent({
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
        return JSON.parse(text);
      } catch (parseError) {
        logger.warn('Failed to parse Gemini verification response');
        return {
          score: 0.5,
          classification: 'unknown',
          analysis: text
        };
      }
    } catch (error) {
      logger.error('Gemini verification error:', error);
      return {
        score: 0.0,
        classification: 'error',
        error: error.message
      };
    }
  }

  async generateAlternativeStrategies(element, context, framework) {
    try {
      const prompt = `
        Generate alternative locator strategies for this element:
        
        Element: ${JSON.stringify(element)}
        Context: ${JSON.stringify(context)}
        Framework: ${framework}
        
        Provide 3-5 different approaches, focusing on:
        1. Robustness against UI changes
        2. Clarity and maintainability
        3. Performance
        
        Return JSON array of alternatives:
        [
          {
            "strategy": "selector string",
            "type": "id|css|xpath|text|aria",
            "confidence": 0.8,
            "reasoning": "explanation"
          }
        ]
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 3,
          topP: 0.9,
          maxOutputTokens: 1024
        }
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        logger.warn('Failed to parse alternative strategies response');
        return [];
      }
    } catch (error) {
      logger.error('Error generating alternative strategies:', error);
      return [];
    }
  }

  async optimizeLocator(locator, framework, issues) {
    try {
      const prompt = `
        Optimize this ${framework} locator to address the identified issues:
        
        Original Locator: ${locator}
        Issues: ${issues.join(', ')}
        Framework: ${framework}
        
        Provide an improved version that:
        1. Addresses the specific issues
        2. Maintains functionality
        3. Follows ${framework} best practices
        
        Return JSON:
        {
          "optimized": "improved selector",
          "improvements": ["what was changed"],
          "confidence": 0.9
        }
      `;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 512
        }
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        logger.warn('Failed to parse optimization response');
        return {
          optimized: locator,
          improvements: [],
          confidence: 0.5
        };
      }
    } catch (error) {
      logger.error('Error optimizing locator:', error);
      return {
        optimized: locator,
        improvements: [],
        confidence: 0.0,
        error: error.message
      };
    }
  }
}

module.exports = new GeminiService();