/*jslint node: true, white: true, indent: 2 */

"use strict";

var express = require('express')
  , pgSession = require('connect-pg-simple')(express.session)
  , ConnectRoles = require('connect-roles')
  , passportify = require('./utils/passportify')
  , Promise = require('promise')
  , _ = require('lodash')
  , busboy = require('connect-busboy')
  , user
  , methodOverride
  , adminPage;

// *** Custom Middleware ***

// The built-in Connect/Express middleware modified to only allow overrides on POST-requests
methodOverride = function (key){
  key = key || "_method";
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
  }
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
  var contentTypes = {}
    , assembleMainPage
    , app
    , config = page.config
    , knex = page.knex;

  // *** Content Type Definitions ***

  if (config.features.speakers) {
    contentTypes.speakers = new (require('./admin/speakers'))();
  }
  if (config.features.agenda) {
    contentTypes.agenda = new (require('./admin/agenda'))();
  }
  if (config.features.puffs) {
    contentTypes.puffIntro = new (require('./admin/puff'))({
      name: 'Intro',
      key : 'puff-intro'
    });
    contentTypes.puffDescription = new (require('./admin/puff'))({
      name: 'Beskrivning',
      key : 'puff-description'
    });
    contentTypes.puffRegistration = new (require('./admin/puff'))({
      name: 'Registreringsformulär',
      key : 'puff-registration',
      syntaxhighlight : 'html',
      help : 'I ett format såsom:\n' +
        '<iframe src="http://example.com/iframe"></iframe>\n' +
        '<a href="http://example.com/page" target="_blank"><img src="http://example.com/button.png" /></a>'
    });
  }
  if (config.features.video) {
    contentTypes.stream1 = new (require('./admin/stream'))({ key : 'stream1' });
    contentTypes.stream2 = new (require('./admin/stream'))({ key : 'stream2' });
  }
  if (config.features.blocks) {
    contentTypes.sirtrevor = new (require('./admin/sirtrevor'))();
  }
  if (config.features.dictionary) {
    contentTypes.dictionary = new (require('./admin/dictionary'))({ name: 'Benämningar' });
  }
  if (config.features.images && _.size(config.admin.images)) {
    contentTypes.images = new (require('./admin/images'))({
      name: 'Bilder',
      help: 'Ladda upp alla @2x-bilder i retina-varianter (dubbla normala storleken alltså)\n' +
      'Alla @2x-bilder kommer automatiskt att förminskas till rätt storlek för enheter som inte stödjer högupplösta bilder (och kommer därmed att bli för små om inte rätt storlek laddas upp)'
    });
  }
  if (config.features.customcss) {
    contentTypes.extracodeCSS = new (require('./admin/extracode'))({
      name: 'Extra CSS',
      key : 'extracode-css',
      help : 'Ibland kan en specifik sajt behöva en liten knuff i rätt riktning stilmässigt. Detta är knuffen.'
    });
  }
  if (config.features.accountadmin) {
    contentTypes.accounts = new (require('./admin/accounts'))();
  }

  // *** Express setup ***

  app = express();

  page.adminApp = app;

  app.use(express.cookieParser());
  app.use(busboy());
  app.use(express.session({
    store: new pgSession(),
    secret: config.cookieSecret,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
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
      var templateChildren = {}, dictionary, element;

      //TODO: Separate out this dictionary calculation
      dictionary = formData.shift();
      dictionary = dictionary && dictionary.value ? dictionary.value : {};
      _.each(config.admin.dictionary, function (value, key) {
        dictionary[key] = dictionary[key] || value[1];
      });

      _.each(contentTypes, function (contentType, contentTypeName) {
        var data = formData.shift();

        if (!req.userCan(contentType.getRequiredPermission())) {
          return;
        }

        //TODO: Make both puffs and streams use a shared collection mechanism rather than individual fixes
        //TODO: Extract the speaker render stuff to the content type
        //TODO: There should basically be no content-type specific form render stuff in this file

        // Deal with the different types of content
        if (contentTypeName === 'speakers') {
          templateChildren[contentTypeName] = {
            template : 'admin-form-speakers',
            form : formOverride[data.formName] || data.form,
            formData : data,
            dictionaryData : dictionary
          };
        } else if (
          contentTypeName === 'puffIntro' ||
          contentTypeName === 'puffDescription' ||
          contentTypeName === 'puffRegistration'
        ) {
          if (!templateChildren.puffs) {
            templateChildren.puffs = {
              templateWrappers : ['admin-section'],
              sectionId : 'puffintro',
              sectionClass : 'admin-puffs',
              sectionTitle : 'Puffar',
              children : []
            };
          }
          templateChildren.puffs.children.push({ template : 'admin-form', formData : data });
        } else if (
          contentTypeName === 'stream1' ||
          contentTypeName === 'stream2'
        ) {
          if (!templateChildren.streams) {
            templateChildren.streams = {
              templateWrappers : ['admin-section'],
              sectionId : 'stream1',
              sectionTitle : 'Strömmar',
              children : []
            };
          }
          templateChildren.streams.children.push({
            template : 'admin-form',
            noAdminPartWrap : true,
            formData : data
          });
        } else if (data.list !== undefined && data.listTemplate) {
          templateChildren[contentTypeName] = {
            templateWrappers : ['admin-section'],
            sectionId : data.id,
            sectionMenu : data.name,
            children : [
              {
                template : 'admin-form',
                noAdminPartWrap : true,
                //TODO: Detect canAdd from content-type
                canAdd : true,
                form : formOverride[data.formName] || data.form,
                formData : data
              },
              { template : data.listTemplate, list : data.list }
            ]
          };
        } else {
          templateChildren[contentTypeName] = {
            template : 'admin-form',
            form : formOverride[data.formName] || data.form,
            formData : data
          };
        }
      });

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
            blockTypes : config.blockTypes,
            flickrKey : config.flickr.key
          }
        },
        children : templateChildren
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
    }, function(req, res, next){
      res.app.get('theme engine').recursiveRenderer({
        templateWrappers : ['layout'],
        children : [{
          template : 'admin-login',
          authServices : page.passportify.services,
        }]
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
    contentType.setPage(page).setMainPageAssemble(assembleMainPage).addToApp(app);
  });

  return app;
};

module.exports = adminPage;
