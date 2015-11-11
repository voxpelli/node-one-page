/* jshint node: true, esnext: true */

'use strict';

var _ = require('lodash');

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
        data : data,
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
      //TODO: Let the themes decide on what order to render stuff! And append everything else at the end?
      var children = [].concat(page.config.front.order)
        , position;

      _.each(page.contentTypes, function (contentType, contentTypeName) {
        var dataKey = contentType.getDataKey()
          , template = contentType.getTemplate(cache.data[dataKey] || {}, cache.dictionary)
          , position = children.indexOf(contentTypeName);

        if (template) {
          template = _.extend({
            templateWrappers : 'front-section'
          }, template);
        }

        if (position === -1) {
          children.push(template);
        } else {
          children[position] = template;
        }
      });

      position = children.indexOf('video');
      if (position !== -1 && cache.activeFeatures.video) {
        children[position] = { template : 'video' };
      }

      position = children.indexOf('map');
      if (position !== -1 && cache.activeFeatures.map) {
        children[position] = {
          templateWrappers : 'front-section',
          template : 'embedded-map',
          variables : {
            menuName : 'Hitta hit',
            name : 'location',
            header : 'Hitta hit'
          }
        };
      }

      children = _.filter(children, function (value) {
        return _.isObject(value);
      });

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

  //TODO: Add these "additional pages" as a feature to the individual content types
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
