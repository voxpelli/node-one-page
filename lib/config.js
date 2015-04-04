/* jshint node: true */
/* global -Promise */

'use strict';

var _ = require('lodash')
  , defaultFeatures = {
    speakers: true,
    agenda: true,
    video: true,
    map: true,
    customcss: true,
    dictionary: true,
    images: true,
    accountadmin: true,
    puffs: true,
    frontpage: true,
  };

module.exports = function (env, prefix) {
  var features = _.clone(defaultFeatures)
    , nodeEnv = env.NODE_ENV || 'development'
    , config;

  prefix = env[prefix + 'PREFIX'] || prefix;

  (env[prefix + 'ACTIVATE_FEATURES'] || '').split(' ').forEach(function (value) {
    features[value.toLowerCase()] = true;
  });

  (env[prefix + 'DISABLE_FEATURES'] || '').split(' ').forEach(function (value) {
    delete features[value.toLowerCase()];
  });

  if (env[prefix + 'DISABLE_VIDEO_STREAMS'] && features.video) {
    delete features.video;
  }

  config = {
    version : require('../package.json').version,
    db : env.DATABASE_URL,
    env : nodeEnv,
    port : parseInt(env.PORT, 10) || 5000,

    // Development specific configurations

    dev : nodeEnv === 'production' ? {} : {
      cleanUpOnSigint : env[prefix + 'DEV_SIGINT_CLEANUP'],
    },

    // Application specific configurations

    cookieSecret : env[prefix + 'COOKIE_SECRET'] || 'faump-ob-tav-giev-va-haph-eel-',
    host : env[prefix + 'HOST'],
    webAuth : {
      user : env.WEB_USER,
      pass : env.WEB_PASS
    },
    twitter : {
      key : env[prefix + 'TWITTER_KEY'],
      secret : env[prefix + 'TWITTER_SECRET']
    },
    github : {
      clientId : env[prefix + 'GITHUB_KEY'],
      clientSecret : env[prefix + 'GITHUB_SECRET']
    },
    flickr : {
      key : env[prefix + 'FLICKR_KEY']
    },
    features : features,
    blockTypes :  env[prefix + 'BLOCK_TYPES'] ? env[prefix + 'BLOCK_TYPES'].split(' ') : [
      'Heading',
      'List',
      'Video',
      'Quote',
      'Text',
      'Flickr',
      'Story'
    ],

    // Admin exposed configurations

    admin : {
      dictionary : {
        // key : [ Admin-label, Default value, Feature dependency, Expose to JS
        sitename : ['Sidnamn', 'Hello World'],
        speakers : ['Talare', 'Talare', 'speakers'],
        speakersHeader : ['Rubrik - Talare', 'Dagens talare', 'speakers'],
        introMore : ['Intro - Läs mer', 'Läs mer om eventet', 'puffs', true]
      },
      images : {}
    }
  };

  _.forEach(config.admin.dictionary, function (value, key) {
    var configValue = env[prefix + 'DICTIONARY_' + key.toUpperCase()];

    if (configValue) { config.admin.dictionary[key][1] = configValue; }
  });

  return config;
};
