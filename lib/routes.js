/* jshint node: true */
/* global -Promise */

'use strict';

var Promise = require('promise')
  , _ = require('lodash');

module.exports = function (page) {
  var config = page.config
    , knex = page.knex
    , cache
    , streamCache
    , routes = {};

  routes.index = function (req, res, next) {
    var frontData = {}, result;

    _.each(page.contentTypes, function (contentType) {
      var dataKey = contentType.getDataKey();
      if (frontData[dataKey] === undefined) {
        frontData[dataKey] = contentType.getDataQuery();
      }
    });

    result = Promise.all(_.values(frontData)).then(function (results) {
      return _.zipObject(_.keys(frontData), results);
    });

    result.then(function (data) {
      var dictionaries = page._fillDictionary((data.vars || {}).dictionary)
        , dictionary = dictionaries.dictionary
        , jsDictionary = dictionaries.jsDictionary;

      // Cache the result so that we can keep the frontend up even if the db is taken down
      cache = {
        speakers : data.speakers,
        agenda : data.agenda,
        vars : data.vars || {},
        dictionary : dictionary,
        jsDictionary : jsDictionary,
        activeFeatures : config.features,
        clientFeatures : _.pick(config.features, ['video'])
      };

      return cache;
    }).then(undefined, function (err) {
      if (cache) {
        return cache;
      }
      throw err;
    }).then(function (cache) {
      var children = [], subChildren;

      //TODO: Move the rendering into the contentype objects

      if (cache.activeFeatures.puffs && cache.vars['puff-intro'] && cache.vars['puff-intro'].header) {
        children.push({
          templateWrappers : 'front-section',
          template : 'puff',
          variables : {
            name : 'intro',
            header : cache.vars['puff-intro'].header,
            body : cache.vars['puff-intro'].body,
            extended : true
          }
        });
      }
      if (cache.activeFeatures.puffs && cache.vars['puff-description'] && cache.vars['puff-description'].body) {
        children.push({
          templateWrappers : 'front-section',
          template : 'puff',
          variables : {
            name : 'description',
            header : cache.vars['puff-description'].header,
            body : cache.vars['puff-description'].body
          }
        });
      }
      if (cache.activeFeatures.video) {
        children.push({ template : 'video' });
      }
      if (cache.activeFeatures.blocks && cache.vars.sirtrevor && cache.vars.sirtrevor.body) {
        subChildren = [];

        //TODO: Remake into a sirtrevor type which resolves these subChildren through an added preRenders function
        _.each(cache.vars.sirtrevor.body, function (content, index) {
          subChildren.push({
            templateWrappers : 'front-section',
            template : 'sirtrevor-block',
            variables : {
              name : 'block-' + index,
              cssClasses : ['block', 'block-' + (index % 2 ? 'odd' : 'even')],
              content : content
            }
          });
        });

        children.push({
          templateWrappers : 'blocks',
          children : subChildren
        });
      }
      if (cache.agenda) {
        children.push({
          template : 'agenda',
          agenda : cache.agenda
        });
      }
      if (cache.speakers) {
        subChildren = [];

        //TODO: Remake into a speaker element type which resolves these subChildren through an added preRenders function
        _.each(cache.speakers, function (speaker) {
          subChildren.push({
            template : 'speaker',
            variables : { el : speaker }
          });
        });

        children.push({
          templateWrappers : 'front-section',
          children : subChildren,
          variables : {
            menuName : cache.dictionary.speakers,
            name : 'speakers',
            header : cache.dictionary.speakersHeader
          }
        });
      }
      if (cache.activeFeatures.puffs && cache.vars['puff-registration'] && cache.vars['puff-registration'].body) {
        children.push({
          templateWrappers : 'front-section',
          template : 'puff',
          variables : {
            menuName : 'Anmäl',
            name : 'register',
            header : cache.vars['puff-registration'].header || 'Anmäl dig',
            body : cache.vars['puff-registration'].body,
            plain : true
          }
        });
      }
      if (cache.activeFeatures.map) {
        children.push({
          templateWrappers : 'front-section',
          template : 'embedded-map',
          variables : {
            menuName : 'Hitta hit',
            name : 'location',
            header : 'Hitta hit'
          }
        });
      }

      return res.app.get('theme engine').recursiveRenderer({
        templateWrappers : ['front-wrapper', 'page', 'layout'],
        children : children,
        variables : cache
      });
    }).then(function (result) {
      res.send(result);
    }).then(undefined, function (err) {
      next(err);
    });
  };

  if (config.features.video) {
    routes.streams = function (req, res, next) {
      knex('vars')
        .select('value', knex.raw('EXTRACT(EPOCH FROM modified)::integer AS modified'))
        .where('key', 'like', 'stream%')
        .orderBy('key', 'asc')
        .map(function (row) {
          row.value.modified = row.modified * 1000;
          return row.value;
        })
        .filter(function (stream) {
          return !!stream.published;
        })
        .then(function (streamData) {
          if (!streamData) {
            throw new Error('No stream content');
          }

          streamCache = streamData;

          return streamCache;
        })
        .then(undefined, function (err) {
          if (streamCache) {
            return streamCache;
          }
          throw err;
        })
        .then(function (streamData) {
          res.json(streamData);
        })
        .then(undefined, function (err) {
          next(err);
        });
    };
  }

  return routes;
};
