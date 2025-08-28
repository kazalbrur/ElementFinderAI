const cheerio = require('cheerio');
const logger = require('../utils/logger');

class ParserService {
  parseHTML(html) {
    try {
      const $ = cheerio.load(html, {
        xmlMode: false,
        decodeEntities: true
      });
      return $;
    } catch (error) {
      logger.error('HTML parsing error:', error);
      throw new Error('Failed to parse HTML content');
    }
  }

  extractMetadata($) {
    return {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content'),
      viewport: $('meta[name="viewport"]').attr('content'),
      charset: $('meta[charset]').attr('charset'),
      language: $('html').attr('lang'),
      forms: $('form').length,
      inputs: $('input').length,
      buttons: $('button').length,
      links: $('a').length,
      images: $('img').length
    };
  }

  findShadowDOMElements($) {
    const shadowHosts = [];
    $('*').each((index, element) => {
      const $el = $(element);
      if ($el.attr('shadowroot') || $el.attr('shadow')) {
        shadowHosts.push({
          tag: element.name,
          id: $el.attr('id'),
          class: $el.attr('class')
        });
      }
    });
    return shadowHosts;
  }

  extractFormElements($) {
    const forms = [];
    
    $('form').each((index, form) => {
      const $form = $(form);
      const formData = {
        id: $form.attr('id'),
        name: $form.attr('name'),
        action: $form.attr('action'),
        method: $form.attr('method'),
        fields: []
      };

      $form.find('input, select, textarea, button').each((i, field) => {
        const $field = $(field);
        formData.fields.push({
          type: field.name,
          name: $field.attr('name'),
          id: $field.attr('id'),
          required: $field.attr('required') !== undefined,
          placeholder: $field.attr('placeholder')
        });
      });

      forms.push(formData);
    });

    return forms;
  }

  extractAccessibilityElements($) {
    const elements = [];

    $('[role], [aria-label], [aria-describedby], [alt]').each((index, element) => {
      const $el = $(element);
      elements.push({
        tag: element.name,
        role: $el.attr('role'),
        ariaLabel: $el.attr('aria-label'),
        ariaDescribedby: $el.attr('aria-describedby'),
        alt: $el.attr('alt'),
        text: $el.text().trim().substring(0, 50)
      });
    });

    return elements;
  }
}

module.exports = new ParserService();