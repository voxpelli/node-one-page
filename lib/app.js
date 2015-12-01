'use strict';

var ExpressWrapper = require('vp-express-wrapper');
var ExpressWrapperDB = require('./utils/express-wrapper-db');
var ExpressWrapperTheme = require('./utils/express-wrapper-themeable');
var _ = require('lodash');

var initRoutes = require('./routes');
var initAdmin = require('./admin');

ExpressWrapper = ExpressWrapperTheme(ExpressWrapperDB(ExpressWrapper));

const onePagePrototype = {};
const onePageStatic = {};

onePagePrototype.constructor = function (config, options) {
  ExpressWrapper.call(this, config, options);

  options = options || {};

  this.contentTypes = {};
  this._contentTypeSetup();

  this.themeEngine = this._themeSetup();
};

onePagePrototype._themeSetup = function (theme) {
  this.constructor.__super__._themeSetup.apply(this, arguments);

  var config = this.config;
  var themeInstance = this.themeEngine.theme;

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
