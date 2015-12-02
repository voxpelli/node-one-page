'use strict';

const expiry = require('static-expiry');
const serveStatic = require('serve-static');
const Tema = require('tema');

var expresslocals = require('./expresslocals');

module.exports = function (ExpressWrapper) {
  const protoProps = {};

  protoProps.constructor = function () {
    ExpressWrapper.apply(this, arguments);

    this.themeEngine = this._themeSetup();
  };

  protoProps._themeSetup = function (theme) {
    var themeEngine;

    theme = theme || this.constructor.basetheme;
    themeEngine = new Tema({ theme : theme });

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

  const staticProps = {};

  staticProps.basetheme = false;
  staticProps.expressLocals = expresslocals;

  return ExpressWrapper.extend(protoProps, staticProps);
};
