'use strict';

var defaultFeatures = {
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

module.exports = function (ExpressConfig) {
  return ExpressConfig.staticExtend({
    testDatabase: 'postgres://postgres@localhost/vtonepage_test',
    _mapEnvToConfig: function (env, prefix) {
      let config = ExpressConfig._mapEnvToConfig.call(this, env, prefix);
      let features = Object.assign({}, defaultFeatures);

      (env[prefix + 'ACTIVATE_FEATURES'] || '').split(' ').forEach(function (value) {
        features[value.toLowerCase()] = true;
      });

      (env[prefix + 'DISABLE_FEATURES'] || '').split(' ').forEach(function (value) {
        delete features[value.toLowerCase()];
      });

      if (env[prefix + 'DISABLE_VIDEO_STREAMS'] && features.video) {
        delete features.video;
      }

      config = Object.assign(config, {
        // version : require('../package.json').version,

        // Application specific configurations

        //FIXME: Warn if not set when in production environment
        cookieSecret : env[prefix + 'COOKIE_SECRET'] || 'faump-ob-tav-giev-va-haph-eel-',
        twitter : {
          key : env[prefix + 'TWITTER_KEY'],
          secret : env[prefix + 'TWITTER_SECRET'],
        },
        github : {
          clientId : env[prefix + 'GITHUB_KEY'],
          clientSecret : env[prefix + 'GITHUB_SECRET'],
        },
        //TODO: Move to the blocks content type
        flickr : {
          key : env[prefix + 'FLICKR_KEY'],
        },
        features : features,
        //TODO: Move to the blocks content type
        blockTypes :  env[prefix + 'BLOCK_TYPES'] ? env[prefix + 'BLOCK_TYPES'].split(' ') : [
          'Heading',
          'List',
          'Video',
          'Quote',
          'Text',
          'Flickr',
          'Story',
        ],

        // Admin exposed configurations

        admin : {
          dictionary : {
            // key : [ Admin-label, Default value, Feature dependency, Expose to JS
            sitename : ['Sidnamn', 'Hello World'],
            speakers : ['Talare', 'Talare', 'speakers'],
            speakersHeader : ['Rubrik - Talare', 'Dagens talare', 'speakers'],
            introMore : ['Intro - Läs mer', 'Läs mer om eventet', 'puffs', true],
          },
          //TODO: Move to the image content type
          images : {},
        },

        // Front related configurations

        front : {
          order : [
            'puffintro',
            'puffdescription',
            'video',
            'sirtrevor',
            'agenda',
            'speakers',
            'puffregistration',
            'map',
          ],
        },
      });

      Object.keys(config.admin.dictionary).forEach(function (key) {
        var configValue = env[prefix + 'DICTIONARY_' + key.toUpperCase()];

        if (configValue) { config.admin.dictionary[key][1] = configValue; }
      });

      return config;
    },
  });
};
