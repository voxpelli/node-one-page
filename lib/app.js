'use strict';

var express = require('express');
var serveStatic = require('serve-static');
var basicAuth = require('basic-auth');
var compression = require('compression');
var extend = require('backbone-extend-standalone');
var Tema = require('tema');
var expiry = require('static-expiry');
var _ = require('lodash');
var expresslocals = require('./utils/expresslocals');
var initRoutes = require('./routes');
var initAdmin = require('./admin');
var ensureSingleHost;
var VTOnePage;

//TODO: Replace with vhost module?
ensureSingleHost = function (page, req, res, next) {
  var port = req.headers['x-forwarded-port'] || page.app.get('port');
  port = (port + '' === '80' ? '' : ':' + port);
  if (!page.config.host || (req.hostname + port) === page.config.host) { return next(); }
  // Let CSS and JS through, to enable eg. https-hosting on Heroku
  if (req.url.indexOf('.css') !== -1 || req.url.indexOf('.js') !== -1) { return next(); }
  res.redirect(req.protocol + '://' + page.config.host + req.url);
};

VTOnePage = function (options, config) {
  options = options || {};

  if (!config) {
    config = VTOnePage.getDefaultConfig(options.env, options.prefix);
  }

  this.onCloseDown = [];
  this.config = config;
  this.knex = require('knex')({ client: 'pg', connection: config.db });

  this.contentTypes = {};
  this._contentTypeSetup();

  this.themeEngine = this._themeSetup();
  this.app = this._appSetup();

  this._routeSetup();

  this._postRouteSetup();
};

VTOnePage.extend = extend;

Object.defineProperty(VTOnePage.prototype, 'basetheme', {
  configurable: true,
  get : function () {
    return require('../basetheme');
  },
});

VTOnePage.prototype.contentTypes = {};

_.each(['base', 'vars'], function (name) {
  Object.defineProperty(VTOnePage.prototype.contentTypes, name, {
    configurable: true,
    get : function () {
      return require('./admin/' + name);
    },
  });
});

VTOnePage.getDefaultEnv = function (env) {
  if (_.isString(env)) {
    require('dotenv').config({path: env});
  } else if (!process.env.DATABASE_URL) {
    require('dotenv').load();
  }

  return process.env;
};

VTOnePage.getDefaultConfig = function (env, prefix) {
  if (!env || _.isString(env)) {
    env = this.getDefaultEnv(env);
  }

  return require('./config')(env, prefix || 'VTONEPAGE_');
};

VTOnePage.prototype._themeSetup = function (theme) {
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

VTOnePage.prototype._fillDictionary = function (dictionary) {
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

VTOnePage.prototype._linkThemeToApp = function (app) {
  var themeEngine = this.themeEngine;

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

VTOnePage.prototype._appSetup = function () {
  var app = express();
  var config = this.config;

  app.set('env', config.env);
  app.set('port', config.port);
  app.disable('x-powered-by');
  app.enable('case sensitive routing');
  app.enable('strict routing');
  //TODO: Activate when on Heroku?
  // app.enable('trust proxy');

  if (config.webAuth.user) {
    app.use(function (req, res, next) {
      var credentials = basicAuth(req);

      if (
        !credentials ||
        config.webAuth.user !== credentials.name ||
        (config.webAuth.pass || '') !== credentials.pass
      ) {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
      } else {
        next();
      }
    });
    app.use(express.basicAuth(function (user, pass) {
      return config.webAuth.user === user && (config.webAuth.pass || '') === pass;
    }));
  }
  app.use(ensureSingleHost.bind(undefined, this));
  app.use(compression());

  this._linkThemeToApp(app);

  return app;
};

VTOnePage.prototype._routeSetup = function () {
  var app = this.app;
  var routes = initRoutes(this);

  app.use('/admin', initAdmin(this));

  if (this.config.features.frontpage) {
    app.get('/', routes.index);
    if (routes.streams) {
      app.get('/streams', routes.streams);
    }
  } else {
    app.get('/', function (req, res) {
      res.redirect('/admin');
    });
  }
};

VTOnePage.prototype._postRouteSetup = function () {
  var app = this.app;

  // development only
  if (app.get('env') === 'development') {
    app.use(require('errorhandler'));
  }
};

VTOnePage.prototype._contentTypeSetup = function () {
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

VTOnePage.prototype.addCloseDownMethod = function (method) {
  this.onCloseDown.push(method);
};

VTOnePage.prototype.addContentType = function (module, requireFeature, options) {
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

VTOnePage.prototype.addAuthenticationService = function (name, strategy) {
  this.passportify.addAuthenticationService(name, strategy);
  return this;
};

VTOnePage.prototype.close = function () {
  var page = this;

  return Promise.all(
    _.map(this.onCloseDown, function (method) {
      return Promise.resolve().then(method);
    })
  ).then(function () {
    // If we've started the DB somewhere, now is the time to close it, when all requests are done.
    return page.knex.destroy();
  });
};

VTOnePage.prototype.createServer = function () {
  var http = require('http');
  var page = this;
  var httpServer = {};

  httpServer = http.createServer(page.app);

  httpServer.on('connection', function (conn) {
    var key = conn.remoteAddress + ':' + conn.remotePort;

    page.httpConnections[key] = conn;

    conn.on('close', function () {
      delete page.httpConnections[key];
    });
  });

  this.httpServer = httpServer;
  this.httpConnections = {};

  return httpServer;
};

VTOnePage.prototype.startServer = function (httpServer) {
  if (!httpServer) {
    httpServer = this.httpServer || this.createServer();
  }

  var page = this;
  var port = this.app.get('port');
  var closeServer;

  httpServer.listen(port, function () {
    console.log('Express server listening on port ' + port);
  });

  closeServer = function () {
    var timeout;

    if (!httpServer) {
      return;
    }

    console.log('Getting ready to shut down. Cleaning up...');

    if (page.httpConnections) {
      // Sometimes we have to force connections to end
      timeout = setTimeout(
        function () {
          console.log('...actively closing server connections...');
          for (var key in page.httpConnections) {
            page.httpConnections[key].end();
          }
        },
        page.config.env === 'production' ? 5000 : 1000
      );
    }

    httpServer.close(function () {
      if (timeout) {
        // We don't always have to force connections to close
        clearTimeout(timeout);
      }

      page.close().done(function () {
        console.log('...fully cleaned up! Shutting down.');
      });
    });

    httpServer = false;
  };

  return closeServer;
};

VTOnePage.prototype.runUntilKillSignal = function () {
  var closeServer = this.startServer();

  if (this.config.dev.cleanUpOnSigint) {
    process.on('SIGINT', closeServer);
  }
  process.on('SIGTERM', closeServer);
};

VTOnePage.subclass = function (expose) {
  var ExistingClass = this;
  var NewClass;

  NewClass = ExistingClass.extend({}, {
    subclassOrRunUntilKillSignal : ExistingClass.subclassOrRunUntilKillSignal,
    subclass : ExistingClass.subclass,
  });

  if (expose.basetheme) {
    Object.defineProperty(NewClass, 'basetheme', {
      configurable: true,
      get : function () {
        var basetheme = expose.basetheme || ExistingClass.basetheme;
        return _.isString(basetheme) ? require(basetheme) : basetheme;
      },
    });
  }

  if (expose.contentTypes) {
    NewClass.prototype.contentTypes = Object.create(ExistingClass.prototype.contentTypes);
    _.each(expose.contentTypes, function (contentType, key) {
      Object.defineProperty(NewClass.prototype.contentTypes, key, {
        configurable: true,
        get : function () {
          return _.isString(contentType) ? require(contentType) : contentType;
        },
      });
    });
  }

  return NewClass;
};

Object.assign(VTOnePage, require('./migration-methods'));

VTOnePage.subclassOrRunUntilKillSignal = function (currentModule, expose, options) {
  var NewClass = expose ? this.subclass(expose) : this;

  if (currentModule.parent) {
    return NewClass;
  } else {
    var page = new NewClass(options);
    page.runUntilKillSignal();
  }
};

module.exports = VTOnePage.subclassOrRunUntilKillSignal(module);
