/* jshint node: true */
/* global -Promise */

'use strict';

var express = require('express')
  , Tema = require('tema')
  , expiry = require('static-expiry')
  , _ = require('lodash')
  , expresslocals = require('./utils/expresslocals')
  , initRoutes = require('./routes')
  , initAdmin = require('./admin')
  , ensureSingleHost
  , httpServer
  , ValtechOnePage
  , page;

ensureSingleHost = function (page, req, res, next) {
  var port = req.headers['x-forwarded-port'] || page.app.get('port');
  port = (port + '' === '80' ? '' : ':' + port);
  if (!page.config.host || (req.host + port) === page.config.host) { return next(); }
  // Let CSS and JS through, to enable eg. https-hosting on Heroku
  if (req.url.indexOf('.css') !== -1 || req.url.indexOf('.js') !== -1) { return next(); }
  res.redirect(req.protocol + '://' + page.config.host + req.url);
};

ValtechOnePage = function (options, config) {
  var app, knex, theme, themeEngine, themeInstance, routes;

  options = options || {};

  if (!config) {
    config = ValtechOnePage.getDefaultConfig(options.env, options.prefix);
  }

  app = express();
  knex = require('knex')({ client: 'pg', connection: config.db });
  theme = options.theme || ValtechOnePage.basetheme;
  themeEngine = new Tema({ theme : theme });
  themeInstance = themeEngine.getThemeInstance(theme);

  _.each(themeInstance.options.valtechOnePageUnsupported || [], function (feature) {
    config.features[feature] = false;
  });
  _.each(themeInstance.options.valtechOnePageDictionary || {}, function (value, key) {
    config.admin.dictionary[key] = value;
  });
  _.each(themeInstance.options.valtechOnePageImages || {}, function (value, key) {
    config.admin.images[key] = value;
  });

  this.app = app;
  this.config = config;
  this.knex = knex;
  this.themeEngine = themeEngine;

  // all environments
  app.set('port', config.port);
  app.set('case sensitive routing', true);
  app.set('strict routing', true);

  if (config.webAuth.user) {
    app.use(express.basicAuth(function (user, pass) {
      return config.webAuth.user === user && (config.webAuth.pass || '') === pass;
    }));
  }
  app.use(ensureSingleHost.bind(undefined, this));
  app.use(express.compress());

  app.set('theme engine', themeEngine);
  app.use(expiry(app, {
    loadCache: 'startup',
    dir: themeEngine.getPublicPaths(),
  }));
  _.each(themeEngine.getPublicPaths(), function (path) {
    app.use(express.static(path, {
      maxAge: 30 * 24 * 60 * 60 * 1000 // Cache for 30 days
    }));
  });

  themeEngine.option('locals', _.extend({
    environment : config.env,
    furl : app.locals.furl
  }, expresslocals()));

  // Routers
  app.use(app.router);
  app.use('/admin', initAdmin(this));

  // development only
  if ('development' === app.get('env')) {
    app.use(express.errorHandler());
  }

  routes = initRoutes(this);

  app.get('/', routes.index);
  if (routes.streams) {
    app.get('/streams', routes.streams);
  }
};

Object.defineProperty(ValtechOnePage, 'basetheme', {
  get : function () {
    return require('../basetheme');
  }
});

ValtechOnePage.getDefaultEnv = function (env) {
  if (_.isString(env)) {
    var dotenv = require('dotenv');
    dotenv._getKeysAndValuesFromEnvFilePath(env);
    dotenv._setEnvs();
  } else if (!process.env.DATABASE_URL) {
    require('dotenv').load();
  }

  return process.env;
};

ValtechOnePage.getDefaultConfig = function (env, prefix) {
  if (!env || _.isString(env)) {
    env = this.getDefaultEnv(env);
  }

  return require('./config')(env, prefix || 'VTONEPAGE_');
};

ValtechOnePage.prototype.addAuthenticationService = function (name, strategy) {
  this.passportify.addAuthenticationService(name, strategy);
  return this;
};

ValtechOnePage.prototype.close = function () {
  // If we've started the DB somewhere, now is the time to close it, when all requests are done.
  this.knex.destroy();
};

if (module.parent) {
  module.exports = ValtechOnePage;
} else {
  page = new ValtechOnePage();

  var http = require('http');

  httpServer = http.createServer(page.app);
  httpServer.listen(page.app.get('port'), function () {
    console.log('Express server listening on port ' + page.app.get('port'));
  });

  process.on('SIGTERM', function () {
    if (httpServer) {
      httpServer.close();
    }
  });
}
