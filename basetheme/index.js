/*jslint node: true, white: true, indent: 2 */

"use strict";

var _ = require('lodash')
  , theme
  , preprocessors = []
  , processor;

preprocessors['sirtrevor-block'] = function (data, callback) {
  var suggestion, name, locals = this.getLocals(theme);

  switch (data.content.type) {
    case 'video':
      suggestion = 'video';
      break;
    case 'text':
      suggestion = 'text';
      break;
    case 'heading':
      suggestion = 'heading';
      name = data.content.data.text || false;
      break;
    case 'quote':
      suggestion = 'quote';
      break;
    case 'flickr':
      suggestion = 'flickr';
      break;
    case 'story':
      suggestion = 'story';
      name = data.content.data.speaker || false;
      break;
    default:
      // Intentionally left out
  }

  if (suggestion) {
    data.templateSuggestions = data.templateSuggestions || [];
    data.templateSuggestions.push('sirtrevor-block-' + suggestion);

    data.block('section-class', 'block-' + suggestion);

    if (name) {
      data.block('section-name', locals.machineName(suggestion + '-' + name));
    }
  }

  callback(null, data);
};

preprocessors['front-section'] = function (data, callback) {
  data.cssClasses = data.cssClasses || [];

  if (data.block('section-class')) {
    data.cssClasses.push(data.block('section-class'));
  }

  if (data.block('section-name')) {
    data.name = data.block('section-name');
  }

  callback(null, data);
};

preprocessors.speaker = function (data, callback) {
  var links = [];

  _.each(data.el.links || {}, function (link, type) {
    var url, name;

    if (!link) {
      return;
    }
    if (link.indexOf('http') === 0) {
      url = link;
    }

    if (type === 'linkedin') {
      url = url || ('http://www.linkedin.com/' +  link);
      name = 'LinkedIn';
    } else if (type === 'twitter') {
      url = url || ('https://twitter.com/' +  encodeURIComponent(link));
      name = 'Twitter';
    } else if (type === 'github') {
      url = url || ('https://github.com/' +  encodeURIComponent(link));
      name = 'GitHub';
    } else if (type === 'dribbble') {
      url = url || ('https://dribbble.com/' +  encodeURIComponent(link));
      name = 'Dribbble';
    } else if (type === 'blog') {
      name = 'Blogg';
    }

    links.push({
      type : type,
      url : url,
      name : name || (type[0].toUpperCase() + type.substr(1))
    });
  });

  data.el.links = links;

  callback(null, data);
};

processor = function (data, callback) {
  // Always join all css classes before handing them over to the template
  if (data.variables.cssClasses && _.isArray(data.variables.cssClasses)) {
    data.variables.cssClasses = data.variables.cssClasses.join(' ');
  }

  callback(null, data);
};

theme = {
  templatePath : __dirname + '/templates/',
  publicPath : __dirname + '/public/',
  preprocessors : preprocessors,
  processor : processor,
  options : {
    renderer : require('ejs').renderFile,
    templateExtension : 'ejs',
    valtechOnePageUnsupported: [ 'map', 'video' ],
  }
};

module.exports = theme;
