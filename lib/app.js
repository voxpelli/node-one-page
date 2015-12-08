'use strict';

const _ = require('lodash');
const LRU = require('lru-cache');

var ExpressWrapper = require('vp-express-wrapper');
var ExpressWrapperDB = require('./utils/express-wrapper-db');
var ExpressWrapperTheme = require('./utils/express-wrapper-themeable');

const initRoutes = require('./routes');
const initAdmin = require('./admin');

ExpressWrapper = ExpressWrapperTheme(ExpressWrapperDB(ExpressWrapper));

const onePagePrototype = {};
const onePageStatic = {};

onePagePrototype.constructor = function (config, options) {
  ExpressWrapper.call(this, config, options);

  options = options || {};

  this.contentTypes = {};
  this._contentTypeSetup();
};

onePagePrototype.cache = function (key, value) {
  if (!this.config.cacheTime) {
    return;
  }

  if (!this.cacheStore) {
    this.cacheStore = LRU({
      maxAge: this.config.cacheTime,
    });
  }

  if (value) {
    this.cacheStore.set(key, value);
  } else {
    return this.cacheStore.get(key);
  }
};

onePagePrototype.fallback = function (key, value) {
  if (!this.fallbackStore) {
    this.fallbackStore = {};
  }

  if (value) {
    this.fallbackStore[key] = value;
  } else {
    return this.fallbackStore[key];
  }
};

onePagePrototype._themeSetup = function (theme) {
  ExpressWrapper.prototype._themeSetup.apply(this, arguments);

  var config = this.config;
  var themeInstance = this.themeEngine.theme;

  _.each(themeInstance.options.vtOnePageUnsupported || [], feature => {
    config.features[feature] = false;
  });
  _.each(themeInstance.options.vtOnePageDictionary || {}, (value, key) => {
    if (typeof value === 'string') {
      if (config.admin.dictionary[key]) {
        config.admin.dictionary[key][1] = value;
      } else {
        this.logger.warn('Theme tried to specify value of unrecognizes dictionary property: ', key);
      }
    } else {
      config.admin.dictionary[key] = value;
    }
  });
  _.each(themeInstance.options.vtOnePageImages || {}, (value, key) => {
    config.admin.images[key] = value;
  });

  config.front.order = _.uniq((themeInstance.options.vtOnePageFrontOrder || []).concat(config.front.order));

  return this.themeEngine;
};

onePagePrototype._fillDictionary = function (dictionary) {
  var result = {};
  var jsDictionary = {};
  var that = this;

  dictionary = dictionary || {};
  dictionary = dictionary.value || dictionary;

  _.each(this.config.admin.dictionary, function (value, key) {
    result[key] = dictionary[key] || value[1];

    if (value[3] === true && (!value[2] || that.config.features[value[2]])) {
      jsDictionary[key] = result[key];
    }
  });

  return {
    dictionary: result,
    jsDictionary: jsDictionary,
  };
};

// onePagePrototype.getDictionary = function (reset) {
//   let cache = this.cache('dictionary');
//
//   if (cache && !reset) {
//     return cache;
//   }
//
//   let contentType = this.contentTypes.dictionary;
//   let query = contentType ? contentType.getDataQuery() : Promise.resolve({});
//   let result = query
//     .then(result => this._fillDictionary((result.vars || {}).dictionary))
//     .catch(err => {
//       this.logger.error(err, 'Failed to load dictionary data');
//
//       let fallback = this.fallback('dictionary');
//       if (fallback) { return fallback; }
//
//       throw err;
//     });
//
//   // If we have a success, then save the data if the next fetch is a failure, but that don't have to be chained
//   result.then(results => this.fallback('dictionary', results).dictionary);
//
//   this.cache('dictionary', result);
//
//   return result;
// };

onePagePrototype._loadDefaultTemplateData = function (reset) {
  let cache = this.cache('defaultTemplateData');

  if (cache && !reset) {
    return cache;
  }

  let frontData = {};

  _.each(this.contentTypes, contentType => {
    let key = contentType.getDataKey();

    if (frontData[key] === undefined && contentType.isDefaultTemplateData()) {
      frontData[key] = contentType.getDataQuery();
    }
  });

  let result = Promise.all(_.values(frontData))
    .then(results => _.zipObject(_.keys(frontData), results))
    .catch(err => {
      this.logger.error(err, 'Failed to load default template data');

      let fallback = this.fallback('defaultTemplateData');
      if (fallback) { return fallback; }

      throw err;
    });

  // If we have a success, then save the data if the next fetch is a failure, but that don't have to be chained
  result.then(results => this.fallback('defaultTemplateData', results));

  this.cache('defaultTemplateData', result);

  return result;
};

onePagePrototype._defaultTemplateVariables = function (variables) {
  return this._loadDefaultTemplateData()
    .then(data => {
      let dictionaries = this._fillDictionary((data.vars || {}).dictionary);

      let defaultVariables = {
        data: data,
        dictionary : dictionaries.dictionary,
        jsDictionary : dictionaries.jsDictionary,
        activeFeatures : this.config.features,
        clientFeatures : _.pick(this.config.features, ['video']),
      };

      let result = Object.assign({}, defaultVariables, variables);

      return result;
    });
};

onePagePrototype.render = function (children, variables, wrappers) {
  return this._defaultTemplateVariables().then(
    variables => ExpressWrapper.prototype.render.call(this, children, variables, wrappers || ['front-wrapper', 'page', 'layout'])
  );
};

onePagePrototype.getRoutes = function () {
  return {
    '/admin': initAdmin(this),
    '/':  initRoutes(this),
  };
};

onePagePrototype._contentTypeSetup = function () {
  this.addContentType('./admin/speakers', 'speakers');
  this.addContentType('./admin/agenda', 'agenda');
  this.addContentType('./admin/puff', 'puffs', {
    name: 'Intro',
    key : 'intro',
    extendable: true,
    requireHeader: true,
  });
  this.addContentType('./admin/puff', 'puffs', {
    name: 'Beskrivning',
    key : 'description',
  });
  this.addContentType('./admin/puff', 'puffs', {
    name: 'Registreringsformulär',
    key : 'registration',
    menuName : 'Anmäl',
    plain : true,
    syntaxhighlight : 'html',
    help : 'I ett format såsom:\n' +
      '<iframe src="http://example.com/iframe"></iframe>\n' +
      '<a href="http://example.com/page" target="_blank"><img src="http://example.com/button.png" /></a>',
  });
  this.addContentType('./admin/stream', 'video', { key : 'stream1' });
  this.addContentType('./admin/stream', 'video', { key : 'stream2' });
  this.addContentType('./admin/sirtrevor', 'blocks');
  this.addContentType('./admin/dictionary', 'dictionary', { name: 'Benämningar' });
  this.addContentType(
    './admin/images',
    _.isEmpty(this.config.admin.images) ? false : 'image',
    {
      name: 'Bilder',
      help: 'Ladda upp alla @2x-bilder i retina-varianter (dubbla normala storleken alltså)\n' +
      'Alla @2x-bilder kommer automatiskt att förminskas till rätt storlek för enheter som inte stödjer högupplösta bilder (och kommer därmed att bli för små om inte rätt storlek laddas upp)',
    }
  );
  this.addContentType('./admin/extracode', 'customcss', {
    name: 'Extra CSS',
    key : 'extracode-css',
    help : 'Ibland kan en specifik sajt behöva en liten knuff i rätt riktning stilmässigt. Detta är knuffen.',
  });
  this.addContentType('./admin/accounts', 'accountadmin');
};

onePagePrototype.addContentType = function (module, requireFeature, options) {
  if (_.isObject(requireFeature)) {
    return this.addContentType(module, undefined, requireFeature);
  }

  if (requireFeature === false || requireFeature && !this.config.features[requireFeature]) {
    return;
  }

  if (_.isString(module)) {
    module = new (require(module))(options);
  }

  module.setPage(this);

  this.contentTypes[module.id] = module;
};

onePagePrototype.addAuthenticationService = function (name, strategy) {
  this.passportify.addAuthenticationService(name, strategy);
  return this;
};

onePageStatic.basetheme = require('../basetheme');
onePageStatic.ExpressConfig = require('./config')(ExpressWrapper.ExpressConfig);
onePageStatic.envConfigPrefix = 'VTONEPAGE_';

module.exports = ExpressWrapper.subclassOrRun(module, {}, onePagePrototype, onePageStatic);

// Expose the base content types, but don't make them be inherited through .extend()
_.each(['Base', 'Vars'], function (name) {
  Object.defineProperty(module.exports, name + 'Type', {
    configurable: true,
    get : function () {
      return require('./admin/' + name.toLowerCase());
    },
  });
});
