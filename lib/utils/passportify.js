/* jshint node: true */
/* global -Promise */

'use strict';

var _ = require('lodash')
  , Passport = require('passport').Passport
  , TwitterStrategy = require('passport-twitter').Strategy
  , GithubStrategy = require('passport-github').Strategy
  , OAuth2Strategy = require('passport-oauth2').Strategy
  , DummyStrategy;

module.exports = function (page) {
  var addAuthenticationService
    , passportCallback
    , services = []
    , passport = new Passport()
    , app = page.adminApp
    , config = page.config
    , knex = page.knex;

  addAuthenticationService = function (service, strategy, oauth) {
    if (_.isPlainObject(strategy)) {
      strategy = new OAuth2Strategy(strategy, passportCallback(service));
    }

    passport.use(service, strategy);

    if (oauth !== false) {
      app.post('/auth/' + service, passport.authenticate(service));
      app.get('/auth/' + service + '/callback', passport.authenticate(service, { successRedirect: '/admin', failureRedirect: '/admin/login' }));
    }

    app.post('/auth/' + service, passport.authenticate(service, { successRedirect: '/admin', failureRedirect: '/admin/login' }));

    services.push(service);
  };

  passportCallback = function (service) {
    return function (token, tokenSecret, profile, done) {
      if (profile === undefined) {
        done(null, { name: 'Unknown User', role: 'editor' });
        return;
      }

      knex('accounts')
        .where({
          identifier: profile.username.toLowerCase(),
          service: service,
        })
        .where(function () {
          this.where('external_id', profile.id).orWhereNull('external_id');
        })
        .update({
          lastlogin: knex.raw('NOW()'),
          external_id: profile.id,
        })
        .returning(['id', 'identifier', 'role'])
        .then(function (rows) {
          done(
            null,
            rows[0] ? {
              id: rows[0].id,
              name: rows[0].identifier,
              role: rows[0].role,
            } : false
          );
        })
        .then(undefined, function () {
          done();
        });
    };
  };

  app.use(passport.initialize({ userProperty: 'passportUser' }));
  app.use(passport.session());

  passport.serializeUser(function (user, done) {
    done(null, user.id ? user.id : user);
  });
  passport.deserializeUser(function (userId, done) {
    if (!_.isNumber(userId)) {
      done(null, userId);
      return;
    }

    knex('accounts').first('id', 'identifier', 'role').where('id', userId).then(function (user) {
      if (user) {
        done(null, {
          id: user.id,
          name: user.identifier,
          role: user.role,
        });
      } else {
        done(null, false);
      }
    }, function (err) {
      console.warn('Failed to check account, got error:', err);
      done(null, false);
    });
  });

  if (config.env === 'development') {
    try { DummyStrategy = require('passport-dummy').Strategy; } catch (e) {}
  }
  if (typeof DummyStrategy !== 'undefined') {
    addAuthenticationService('dummy', new DummyStrategy(function (done) {
      done(null, { name: 'Dummy User', role: 'admin' });
    }));
  }

  if (config.twitter.key) {
    addAuthenticationService('twitter', new TwitterStrategy({
      consumerKey: config.twitter.key,
      consumerSecret: config.twitter.secret,
      callbackURL: 'http://' + config.host + '/admin/auth/twitter/callback'
    }, passportCallback('twitter')));
  }

  if (config.github.clientId) {
    addAuthenticationService('github', new GithubStrategy({
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: 'http://' + config.host + '/admin/auth/github/callback'
    }, passportCallback('github')));
  }

  return {
    services: services,
    addAuthenticationService: addAuthenticationService
  };
};
