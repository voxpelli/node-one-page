'use strict';

const _ = require('lodash');
const LRU = require('lru-cache');
const PGPubsub = require('pg-pubsub');

var ExpressWrapper = require('vp-express-wrapper');
var ExpressWrapperDB = require('./utils/express-wrapper-db');
var ExpressWrapperTheme = require('./utils/express-wrapper-themeable');

const initRoutes = require('./routes');
const initAdmin = require('./admin');
const renderPage = require('./render-page');

ExpressWrapper = ExpressWrapperTheme(ExpressWrapperDB(ExpressWrapper));

const onePagePrototype = {};
const onePageStatic = {};

onePagePrototype.constructor = function (config, options) {
  ExpressWrapper.call(this, config, options);

  options = options || {};

  this.pubsub = new PGPubsub(this.config.db, {
    log: this.logger.debug.bind(this.logger),
  });

  this.contentTypes = {};
  this._contentTypeSetup();
};

onePagePrototype.close = function () {
  this.pubsub.close();
  return ExpressWrapper.prototype.close.call(this);
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
  var themeOptions = this.getThemeOptions();

  _.each(themeOptions.vtOnePageUnsupported || [], feature => {
    config.features[feature] = false;
  });
  _.each(themeOptions.vtOnePageDictionary || {}, (value, key) => {
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
  _.each(themeOptions.vtOnePageImages || {}, (value, key) => {
    config.admin.images[key] = value;
  });

  config.front.order = _.uniq((themeOptions.vtOnePageFrontOrder || []).concat(config.front.order));

  return this.themeEngine;
};

onePagePrototype.getPageTemplates = function () {
  return _.mapValues(this.getThemeOptions().vtOnePageTemplates || {}, (value, key) => {
    if (value.template === undefined) { value.template = key; }
    return value;
  });
};

onePagePrototype.getDictionary = function () {
  return this.contentTypes.dictionary ? this.contentTypes.dictionary.getData() : Promise.resolve({});
};

// TODO: Remove! Now part of dictionary content type
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

onePagePrototype._loadDefaultTemplateData = function (reset) {
  let frontData = {};

  _.each(this.contentTypes, contentType => {
    if (contentType.isDefaultTemplateData()) {
      frontData[contentType.getId()] = contentType.getData();
    }
  });

  let result = Promise.all(_.values(frontData))
    .then(results => _.zipObject(_.keys(frontData), results));

  return result;
};

onePagePrototype._defaultTemplateVariables = function (variables) {
  return this._loadDefaultTemplateData()
    .then(data => {
      let defaultVariables = {
        data: data,
        activeFeatures : this.config.features,
        clientFeatures : _.pick(this.config.features, ['video']),
        configHost: this.config.host ? (this.config.hostHttps ? 'https' : 'http') + '://' + this.config.host : '',
      };

      let result = Object.assign({}, defaultVariables, variables);

      return result;
    });
};

onePagePrototype.render = function (children, variables, wrappers, template) {
  if (!wrappers) { wrappers = ['standard-wrapper', 'page', 'layout']; }

  return this._defaultTemplateVariables(variables).then(
    variables => ExpressWrapper.prototype.render.call(this, children, variables, wrappers, template)
  );
};

onePagePrototype.renderPage = function (currentPage, title, template) {
  return renderPage.apply(undefined, [this].concat(Array.prototype.slice.call(arguments)));
};

onePagePrototype.getExportablePages = function () {
  return Promise.all([].concat(
    this.config.features.frontpage ? '/' : [],
    Object.keys(this.contentTypes)
      .map(type => this.contentTypes[type].getExportablePages())
  ))
    .then(exportablePages => exportablePages.reduce((result, item) => result.concat(item || []), []));
};

onePagePrototype.getRoutes = function () {
  let routes = {
    '/':  initRoutes(this),
  };

  _.each(this.contentTypes, contentType => {
    Object.assign(routes, contentType.getRoutes());
  });

  Object.assign(routes, {
    '/admin': initAdmin(this),
  });

  return routes;
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
  this.addContentType('./admin/multipage', 'multipage');
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

  this.emit('new-content-type-' + module.id, module);

  this._contentTypeIntegrationsSetup(module);
};

onePagePrototype._contentTypeIntegrationsSetup = function (module) {
  module.hasIntegrations().forEach(integration => {
    let contentType = this.contentTypes[integration];

    if (contentType) {
      module.addIntegration(contentType);
    } else {
      this.once('new-content-type-' + integration, contentType => module.addIntegration(contentType));
    }
  });
};

onePagePrototype.addAuthenticationService = function (name, strategy) {
  this.passportify.addAuthenticationService(name, strategy);
  return this;
};

onePageStatic.basetheme = require('../basetheme');
onePageStatic.ExpressConfig = require('./config')(ExpressWrapper.ExpressConfig);
onePageStatic.envConfigPrefix = 'VTONEPAGE_';
onePageStatic.dbDependencies = {
  'multipage': __dirname + '/admin/multipage',
};

module.exports = ExpressWrapper.subclassOrRun(module, {}, onePagePrototype, onePageStatic);

// Expose the base content types, but don't make them be inherited through .extend()
// TODO: Remove "speakers" from here and extract as its own module instead
_.each(['Base', 'Vars', 'Speakers', 'Agenda'], function (name) {
  Object.defineProperty(module.exports, name + 'Type', {
    configurable: true,
    get : function () {
      return require('./admin/' + name.toLowerCase());
    },
  });
});
