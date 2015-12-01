'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var PgSession = require('connect-pg-simple')(session);
var ConnectRoles = require('connect-roles');
var passportify = require('./utils/passportify');
var _ = require('lodash');
var busboy = require('connect-busboy');
var user;
var methodOverride;
var adminPage;

// *** Custom Middleware ***

// The built-in Connect/Express middleware modified to only allow overrides on POST-requests
methodOverride = function (key) {
  key = key || '_method';
  return function methodOverride(req, res, next) {
    if ((req.originalMethod || req.method).toUpperCase() !== 'POST') {
      next();
      return;
    }

    req.originalMethod = req.originalMethod || req.method;

    if (req.query && key in req.query) {
      req.method = req.query[key].toUpperCase();
      delete req.query[key];
    } else if (req.body && key in req.body) {
      req.method = req.body[key].toUpperCase();
      delete req.body[key];
    } else if (req.headers['x-http-method-override']) {
      req.method = req.headers['x-http-method-override'].toUpperCase();
    }

    next();
  };
};

// *** User Role Definitions ***

user = new ConnectRoles({
  userProperty: 'passportUser',
  failureHandler: function (req, res, action) {
    if (!req.isAuthenticated()) {
      res.redirect('/admin/login');
    } else {
      res.status(403);
      res.send('Access Denied - You don\'t have permission to: ' + action);
    }
  },
});

user.use(function (req) {
  if (!req.isAuthenticated()) {
    return false;
  }
});
user.use('edit content', function (req) {
  if (req.passportUser.role === 'editor') {
    return true;
  }
});
user.use(function (req) {
  if (req.passportUser.role === 'admin') {
    return true;
  }
});

adminPage = function (page) {
  var contentTypes = page.contentTypes;
  var assembleMainPage;
  var app;
  var sessionStore = new PgSession();
  var config = page.config;
  var knex = page.knex;

  page.on('close', function () {
    sessionStore.close();
  });

  // *** Express setup ***

  app = express();

  page.adminApp = app;

  app.use(cookieParser());
  app.use(busboy());
  app.use(session({
    store: sessionStore,
    secret: config.cookieSecret,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    resave: false,
    saveUninitialized: false,
  }));
  app.use(methodOverride());
  app.use(user.middleware());

  page.passportify = passportify(page);

  // *** Routes ***

  assembleMainPage = function (req, res, next, formOverride) {
    formOverride = formOverride || {};

    var queries;

    queries = _.map(contentTypes, function (contentType) {
      return req.userCan(contentType.getRequiredPermission()) ? contentType.getFormTemplateData() : Promise.resolve();
    });

    queries.unshift(knex('vars').first('value').where('key', 'dictionary'));

    Promise.all(queries).then(function (formData) {
      var templateChildren = {};
      var dictionary = page._fillDictionary(formData.shift()).dictionary;
      var element;

      _.each(contentTypes, function (contentType, contentTypeName) {
        var data = formData.shift();
        var formGroup = contentType.getFormGroup();
        var template;
        var formTemplate;
        var listTemplate;

        if (!req.userCan(contentType.getRequiredPermission())) {
          return;
        }

        //TODO: Move some of this logic into node-tema preprocessor / processor methods?

        formTemplate = _.extend({
          form : formOverride[data.formName] || data.form,
          formData : data,
          dictionaryData : dictionary,
        }, contentType.getFormTemplate());

        if (data.list !== undefined && contentType.getFormListTemplate()) {
          listTemplate = _.extend({ list : data.list }, contentType.getFormListTemplate());
        }

        // Do we need to wrap the parts together?
        if (formTemplate && listTemplate) {
          template = _.extend({ children : [] }, contentType.getFormWrapper(data));
          template.children.push(_.extend({
            noAdminPartWrap : true,
            canAdd : true,
          }, formTemplate));
          template.children.push(listTemplate);
        } else {
          template = listTemplate || formTemplate;
        }

        // Should we group it together with other forms?
        if (formGroup) {
          if (!templateChildren[formGroup.name]) {
            templateChildren[formGroup.name] = _.extend({
              templateWrappers : ['admin-section'],
              children : [],
            }, formGroup.attributes || {});
          }
          templateChildren[formGroup.name].children.push(_.extend({
            noAdminPartWrap : formGroup.noAdminPartWrap,
          }, template));
        } else {
          templateChildren[contentTypeName] = template;
        }
      });

      //TODO: Deal with ordering of form in the same way here as in "routes.js"
      templateChildren = _.values(templateChildren);

      if (templateChildren.length === 1) {
        element = templateChildren[0];
        if (element.template === 'admin-form') {
          element.formData.name = undefined;
        }
      }

      res.app.get('theme engine').recursiveRenderer({
        templateWrappers : ['admin-index', 'page', 'layout'],
        dictionaryData : dictionary,
        variables : {
          jsConfig : {
            //TODO: Move into the blocks content type
            blockTypes : _.difference(config.blockTypes, config.flickr.key ? [] : ['Flickr', 'Story']),
            flickrKey : config.flickr.key,
          },
        },
        children : templateChildren,
      }, function (err, result) {
        if (err) {
          next(err);
        } else {
          res.send(result);
        }
      });
    }).then(undefined, next);
  };

  app.get('/', user.can('edit content'), function (req, res, next) {
    assembleMainPage(req, res, next);
  });
  app.get('/login', function (req, res, next) {
    if (!req.isAuthenticated()) { return next(); }
    res.redirect('/admin');
  }, function (req, res, next) {
    res.app.get('theme engine').recursiveRenderer({
      templateWrappers : ['layout'],
      children : [{
        template : 'admin-login',
        authServices : page.passportify.services,
      }],
    }, function (err, result) {
      if (err) {
        next(err);
      } else {
        res.send(result);
      }
    });
  });
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/admin');
  });

  _.each(contentTypes, function (contentType) {
    contentType.setAdminPageAssemble(assembleMainPage).addToAdmin(app);
  });

  return app;
};

module.exports = adminPage;
