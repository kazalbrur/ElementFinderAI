const logger = require('../utils/logger');

class RankingService {
  constructor() {
    this.weights = {
      uniqueness: 0.25,
      stability: 0.25,
      readability: 0.20,
      performance: 0.15,
      accessibility: 0.15
    };
  }

  rankStrategies(strategies, $element, $) {
    try {
      if (!Array.isArray(strategies) || strategies.length === 0) {
        logger.warn('No strategies provided for ranking');
        return [];
      }

      if (!$ || typeof $ !== 'function') {
        logger.error('Cheerio object ($) not provided or invalid');
        throw new Error('Cheerio object is required for ranking strategies');
      }

      const scoredStrategies = strategies
        .filter(strategy => strategy !== null && strategy !== undefined)
        .map(strategy => this.scoreStrategy(strategy, $element, $))
        .filter(strategy => strategy !== null)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5); // Return top 5 strategies

      // Add rank to each strategy
      scoredStrategies.forEach((strategy, index) => {
        strategy.rank = index + 1;
      });

      logger.debug(`Ranked ${scoredStrategies.length} strategies`);
      return scoredStrategies;

    } catch (error) {
      logger.error('Error ranking strategies:', error);
      // Return strategies without ranking as fallback
      return strategies.slice(0, 5).map((strategy, index) => ({
        ...strategy,
        rank: index + 1,
        totalScore: 0.5,
        scores: {
          uniqueness: 0.5,
          stability: 0.5,
          readability: 0.5,
          performance: 0.5,
          accessibility: 0.5
        }
      }));
    }
  }

  scoreStrategy(strategy, $element, $) {
    try {
      if (!strategy || !strategy.type || !strategy.value) {
        logger.warn('Invalid strategy provided:', strategy);
        return null;
      }

      const scores = {
        uniqueness: this.calculateUniqueness(strategy, $element, $),
        stability: this.calculateStability(strategy, $element),
        readability: this.calculateReadability(strategy),
        performance: this.calculatePerformance(strategy),
        accessibility: this.calculateAccessibility(strategy, $element)
      };

      // Ensure all scores are valid numbers
      Object.keys(scores).forEach(key => {
        if (typeof scores[key] !== 'number' || isNaN(scores[key])) {
          scores[key] = 0.5;
        }
      });

      const totalScore = Object.keys(scores).reduce((total, key) => {
        return total + (scores[key] * this.weights[key]);
      }, 0);

      return {
        ...strategy,
        scores,
        totalScore: Math.round(totalScore * 100) / 100,
        rank: 0 // Will be set after sorting
      };

    } catch (error) {
      logger.warn('Error scoring strategy:', error, strategy);
      return {
        ...strategy,
        scores: {
          uniqueness: 0.5,
          stability: 0.5,
          readability: 0.5,
          performance: 0.5,
          accessibility: 0.5
        },
        totalScore: 0.5,
        rank: 0
      };
    }
  }

  calculateUniqueness(strategy, $element, $) {
    try {
      let count = 0;
      const { type, value } = strategy;

      switch (type) {
        case 'id':
          if (typeof value === 'string' && value.trim()) {
            count = $(`#${value.replace(/['"\\]/g, '\\$&')}`).length;
          }
          break;
        case 'name':
          if (typeof value === 'string' && value.trim()) {
            count = $(`[name="${value.replace(/['"\\]/g, '\\$&')}"]`).length;
          }
          break;
        case 'class':
          if (typeof value === 'string' && value.trim()) {
            count = $(`.${value.replace(/['"\\]/g, '\\$&')}`).length;
          }
          break;
        case 'css':
          try {
            count = $(value).length;
          } catch (e) {
            count = 0;
          }
          break;
        case 'xpath':
          // For XPath, we'll estimate based on complexity
          count = typeof value === 'string' && value.includes('[@') ? 1 : 3;
          break;
        case 'text':
          if (typeof value === 'string' && value.trim()) {
            // Use a safer text search
            count = $('*').filter(function() {
              return $(this).text().trim() === value;
            }).length;
          }
          break;
        case 'aria-label':
          if (typeof value === 'string' && value.trim()) {
            count = $(`[aria-label="${value.replace(/['"\\]/g, '\\$&')}"]`).length;
          }
          break;
        case 'role':
          if (typeof value === 'string' && value.trim()) {
            count = $(`[role="${value.replace(/['"\\]/g, '\\$&')}"]`).length;
          }
          break;
        case 'data':
          if (value && value.name && value.value) {
            count = $(`[${value.name}="${value.value.toString().replace(/['"\\]/g, '\\$&')}"]`).length;
          }
          break;
        default:
          count = 2;
      }

      // Perfect uniqueness = 1.0, non-unique = 0.0
      if (count === 0) return 0.0;
      if (count === 1) return 1.0;
      if (count <= 3) return 0.8;
      if (count <= 5) return 0.6;
      return 0.3;

    } catch (error) {
      logger.warn('Error calculating uniqueness:', error.message);
      return 0.5;
    }
  }

  calculateStability(strategy, $element) {
    try {
      const { type, value } = strategy;
      let stability = 0.5;

      switch (type) {
        case 'id':
          stability = 0.9;
          if (typeof value === 'string') {
            // Reduce if ID looks auto-generated
            if (/^\d+$/.test(value)) stability -= 0.4;
            if (/[a-f0-9]{8,}/i.test(value)) stability -= 0.3;
            if (value.includes('random') || value.includes('temp')) stability -= 0.5;
          }
          break;

        case 'name':
          stability = 0.85;
          if (typeof value === 'string' && /^\d+$/.test(value)) stability -= 0.3;
          break;

        case 'data':
          stability = 0.8;
          if (value && value.name) {
            // Data attributes are usually stable
            if (value.name.includes('test') || value.name.includes('qa')) stability += 0.1;
            if (value.name.includes('id') || value.name.includes('key')) stability -= 0.2;
          }
          break;

        case 'aria-label':
          stability = 0.75;
          break;

        case 'class':
          stability = 0.6;
          if (typeof value === 'string') {
            // Single class names are more stable
            if (!value.includes(' ')) stability += 0.1;
            // Utility classes are less stable
            if (/^(btn|button|link|text|bg|p-|m-|w-|h-)/.test(value)) stability -= 0.2;
          }
          break;

        case 'role':
          stability = 0.7;
          break;

        case 'css':
          stability = 0.5;
          if (typeof value === 'string') {
            // Complex selectors are less stable
            if ((value.match(/>/g) || []).length > 2) stability -= 0.2;
            if (value.includes(':nth-child')) stability -= 0.3;
          }
          break;

        case 'xpath':
          stability = 0.4;
          if (typeof value === 'string') {
            // XPath with position is very unstable
            if (/\[\d+\]/.test(value)) stability -= 0.3;
            if ((value.match(/\//g) || []).length > 4) stability -= 0.2;
          }
          break;

        case 'text':
          stability = 0.3;
          if (typeof value === 'string') {
            // Short, specific text is more stable
            if (value.length < 10 && !/\d/.test(value)) stability += 0.2;
          }
          break;
      }

      return Math.max(0, Math.min(1, stability));

    } catch (error) {
      logger.warn('Error calculating stability:', error.message);
      return 0.5;
    }
  }

  calculateReadability(strategy) {
    try {
      const { type, value, selector } = strategy;
      let readability = 0.5;

      switch (type) {
        case 'id':
          readability = 0.9;
          if (typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
            readability += 0.1;
          }
          break;

        case 'name':
          readability = 0.85;
          break;

        case 'aria-label':
          readability = 0.8;
          break;

        case 'data':
          readability = 0.75;
          if (value && value.name && value.name.includes('test')) readability += 0.15;
          break;

        case 'text':
          readability = 0.7;
          if (typeof value === 'string' && value.length > 30) readability -= 0.2;
          break;

        case 'class':
          readability = 0.6;
          if (typeof value === 'string' && value.length > 20) readability -= 0.1;
          break;

        case 'role':
          readability = 0.65;
          break;

        case 'css':
          readability = 0.4;
          if (typeof selector === 'string' && selector.length > 50) readability -= 0.1;
          break;

        case 'xpath':
          readability = 0.3;
          if (typeof selector === 'string' && selector.length > 100) readability -= 0.2;
          break;
      }

      return Math.max(0, Math.min(1, readability));

    } catch (error) {
      logger.warn('Error calculating readability:', error.message);
      return 0.5;
    }
  }

  calculatePerformance(strategy) {
    try {
      const { type, value, selector } = strategy;
      let performance = 0.5;

      switch (type) {
        case 'id':
          performance = 1.0;
          break;

        case 'name':
          performance = 0.9;
          break;

        case 'class':
          performance = 0.8;
          break;

        case 'data':
          performance = 0.75;
          break;

        case 'aria-label':
        case 'role':
          performance = 0.7;
          break;

        case 'css':
          performance = 0.6;
          if (typeof selector === 'string') {
            // Complex selectors are slower
            if ((selector.match(/\s+/g) || []).length > 2) performance -= 0.2;
            if (selector.includes('*')) performance -= 0.3;
          }
          break;

        case 'xpath':
          performance = 0.4;
          if (typeof selector === 'string') {
            // XPath is generally slower
            if (selector.includes('//')) performance -= 0.1;
            if ((selector.match(/\[/g) || []).length > 2) performance -= 0.1;
          }
          break;

        case 'text':
          performance = 0.3;
          // Text searches can be slow
          break;
      }

      return Math.max(0, Math.min(1, performance));

    } catch (error) {
      logger.warn('Error calculating performance:', error.message);
      return 0.5;
    }
  }

  calculateAccessibility(strategy, $element) {
    try {
      const { type, value } = strategy;
      let accessibility = 0.5;

      // Accessibility-focused selectors get higher scores
      switch (type) {
        case 'aria-label':
          accessibility = 1.0;
          break;

        case 'role':
          accessibility = 0.9;
          break;

        case 'id':
          // Check if ID is referenced by labels
          accessibility = 0.6;
          if ($ && $element && typeof value === 'string') {
            try {
              const hasLabel = $(`label[for="${value.replace(/['"\\]/g, '\\$&')}"]`).length > 0;
              accessibility = hasLabel ? 0.8 : 0.6;
            } catch (e) {
              // Ignore label check error
            }
          }
          break;

        case 'name':
          accessibility = 0.7;
          break;

        case 'text':
          // Visible text is accessible
          accessibility = 0.8;
          break;

        case 'data':
          // Data attributes don't contribute to accessibility
          accessibility = 0.3;
          break;

        case 'class':
          accessibility = 0.4;
          break;

        case 'css':
        case 'xpath':
          accessibility = 0.2;
          break;
      }

      // Bonus for elements with good accessibility attributes
      if ($ && $element) {
        try {
          const ariaLabel = $element.attr('aria-label');
          const ariaDescribedBy = $element.attr('aria-describedby');
          const role = $element.attr('role');

          if (ariaLabel) accessibility += 0.1;
          if (ariaDescribedBy) accessibility += 0.05;
          if (role) accessibility += 0.1;
        } catch (e) {
          // Ignore attribute check errors
        }
      }

      return Math.max(0, Math.min(1, accessibility));

    } catch (error) {
      logger.warn('Error calculating accessibility:', error.message);
      return 0.5;
    }
  }

  getRecommendations(strategies, $element) {
    try {
      const recommendations = [];
      
      if (!Array.isArray(strategies) || strategies.length === 0) {
        return ['No strategies available for analysis'];
      }

      const topStrategy = strategies[0];

      if (topStrategy.totalScore < 0.7) {
        recommendations.push('Consider adding a unique ID or data-testid attribute to this element');
      }

      if ($ && $element) {
        try {
          if (!$element.attr('aria-label') && !$element.attr('role')) {
            recommendations.push('Add accessibility attributes (aria-label, role) for better locator options');
          }
        } catch (e) {
          // Ignore attribute check error
        }
      }

      const hasStableLocator = strategies.some(s => s.scores && s.scores.stability > 0.8);
      if (!hasStableLocator) {
        recommendations.push('Current locators may be fragile - consider more stable alternatives');
      }

      const hasUniqueLocator = strategies.some(s => s.scores && s.scores.uniqueness === 1.0);
      if (!hasUniqueLocator) {
        recommendations.push('No unique locators found - element may be difficult to target reliably');
      }

      return recommendations.length > 0 ? recommendations : ['Locator strategies look good'];

    } catch (error) {
      logger.warn('Error generating recommendations:', error.message);
      return ['Unable to generate recommendations'];
    }
  }

  adjustScoresBasedOnContext(strategies, context) {
    try {
      if (!Array.isArray(strategies) || !context) {
        return strategies;
      }

      return strategies.map(strategy => {
        let adjustment = 0;

        // Form context
        if (context.form) {
          if (strategy.type === 'name') adjustment += 0.1;
          if (strategy.type === 'id') adjustment += 0.05;
        }

        // Navigation context
        if (context.navigation) {
          if (strategy.type === 'text') adjustment += 0.1;
          if (strategy.type === 'role') adjustment += 0.05;
        }

        // Adjust total score
        const adjustedScore = Math.max(0, Math.min(1, strategy.totalScore + adjustment));

        return {
          ...strategy,
          totalScore: Math.round(adjustedScore * 100) / 100
        };
      });

    } catch (error) {
      logger.warn('Error adjusting scores based on context:', error.message);
      return strategies;
    }
  }
}

module.exports = new RankingService();