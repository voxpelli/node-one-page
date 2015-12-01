'use strict';

var serveStatic = require('serve-static');
var ExpressWrapper = require('vp-express-wrapper');
var ExpressWrapperDB = require('./utils/express-wrapper-db');
var Tema = require('tema');
var expiry = require('static-expiry');
var _ = require('lodash');
var expresslocals = require('./utils/expresslocals');
var initRoutes = require('./routes');
var initAdmin = require('./admin');

ExpressWrapper = ExpressWrapperDB(ExpressWrapper);

const onePagePrototype = {};
const onePageStatic = {};

onePagePrototype.constructor = function (config, options) {
  ExpressWrapper.call(this, config, options);

  options = options || {};

  this.contentTypes = {};
  this._contentTypeSetup();

  this.themeEngine = this._themeSetup();
};

onePagePrototype.basetheme = require('../basetheme');

// TODO: Readd?
// VTOnePage.prototype.contentTypes = {};
//
// _.each(['base', 'vars'], function (name) {
//   Object.defineProperty(VTOnePage.prototype.contentTypes, name, {
//     configurable: true,
//     get : function () {
//       return require('./admin/' + name);
//     },
//   });
// });

onePagePrototype._themeSetup = function (theme) {
  var config = this.config;
  var themeEngine;
  var themeInstance;

  theme = theme || this.basetheme;
  themeEngine = new Tema({ theme : theme });
  themeInstance = themeEngine.getThemeInstance(theme);

  this.themeEngine = themeEngine;

  _.each(themeInstance.options.vtOnePageUnsupported || [], function (feature) {
    config.features[feature] = false;
  });
  _.each(themeInstance.options.vtOnePageDictionary || {}, function (value, key) {
    config.admin.dictionary[key] = value;
  });
  _.each(themeInstance.options.vtOnePageImages || {}, function (value, key) {
    config.admin.images[key] = value;
  });

  config.front.order = _.uniq((themeInstance.options.vtOnePageFrontOrder || []).concat(config.front.order));

  return themeEngine;
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

onePagePrototype._middlewareSetup = function () {
  this.constructor.__super__._middlewareSetup.call(this);
  this._linkThemeToApp();
};

onePagePrototype._linkThemeToApp = function () {
  var themeEngine = this.themeEngine;
  var app = this.app;

  app.set('theme engine', themeEngine);
  app.use(expiry(app, {
    loadCache: 'startup',
    dir: themeEngine.getPublicPaths(),
  }));
  _.each(themeEngine.getPublicPaths(), function (path) {
    app.use(serveStatic(path, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // Cache for 30 days
    }));
  });

  themeEngine.option('locals', _.extend({
    environment : this.config.env,
    furl : app.locals.furl,
  }, expresslocals()));
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

  //TODO: What to do about this one?
  // if (expose.contentTypes) {
  //   NewClass.prototype.contentTypes = Object.create(ExistingClass.prototype.contentTypes);
  //   _.each(expose.contentTypes, function (contentType, key) {
  //     Object.defineProperty(NewClass.prototype.contentTypes, key, {
  //       configurable: true,
  //       get : function () {
  //         return _.isString(contentType) ? require(contentType) : contentType;
  //       },
  //     });
  //   });
  // }

onePageStatic.ExpressConfig = require('./config')(ExpressWrapper.ExpressConfig);

module.exports = ExpressWrapper.subclassOrRun(module, {}, onePagePrototype, onePageStatic);
