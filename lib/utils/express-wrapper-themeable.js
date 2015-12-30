'use strict';

const expiry = require('static-expiry');
const serveStatic = require('serve-static');
const Tema = require('tema');

var expresslocals = require('./expresslocals');

module.exports = function (ExpressWrapper) {
  const ExpressConfig = ExpressWrapper.ExpressConfig;

  const protoProps = {};

  protoProps.constructor = function () {
    ExpressWrapper.apply(this, arguments);

    this.themeEngine = this._themeSetup();
  };

  protoProps._themeSetup = function (theme) {
    var themeEngine;

    theme = theme || this.constructor.basetheme;

    themeEngine = new Tema({
      theme : theme,
      cache : this.config.templateCache,
    });

    this.themeEngine = themeEngine;

    return themeEngine;
  };

  protoProps._middlewareSetup = function () {
    ExpressWrapper.prototype._middlewareSetup.apply(this, arguments);

    var themeEngine = this.themeEngine;
    var app = this.app;

    app.set('theme engine', themeEngine);
    app.use(expiry(app, {
      loadCache: 'startup',
      dir: themeEngine.getPublicPaths(),
    }));
    themeEngine.getPublicPaths().forEach(function (path) {
      app.use(serveStatic(path, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // Cache for 30 days
      }));
    });

    themeEngine.option('locals', Object.assign({
      environment : this.config.env,
      furl : app.locals.furl,
    }, this.constructor.expressLocals()));
  };

  protoProps.render = function (children, variables, wrappers) {
    let data = {
      templateWrappers: wrappers || ['layout'],
      variables : variables,
    };

    if (typeof children === 'string') {
      data.template = children;
    } else {
      data.children = children;
    }

    return this.themeEngine.recursiveRenderer(data);
  };

  const staticProps = {};

  staticProps.basetheme = false;
  staticProps.expressLocals = expresslocals;

  staticProps.ExpressConfig = ExpressConfig.staticExtend({
    _mapEnvToConfig: function (env, prefix) {
      let config = ExpressConfig._mapEnvToConfig.call(this, env, prefix);
      let templateCache = env[prefix + 'TEMPLATE_CACHE'] ? parseInt(env[prefix + 'TEMPLATE_CACHE'], 10) : config.env === 'production';

      templateCache = Number.isNaN(templateCache) ? true : templateCache;

      return Object.assign(config, {
        templateCache: templateCache,
      });
    },
  });

  return ExpressWrapper.extend(protoProps, staticProps);
};
