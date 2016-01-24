'use strict';

var express = require('express');

module.exports = function (page) {
  var config = page.config;
  var knex = page.knex;
  var streamCache;
  var router = express.Router({
    caseSensitive: true,
    strict: true,
  });

  //TODO: Make use of .getData() and the new dictionary data from there!
  router.get(
    '/',
    page.config.features.frontpage
      ? (req, res, next) => page.renderPage(0)
        .then(result => res.send(result))
        .catch(next)
      : (req, res) => res.redirect('/admin')
  );

  //TODO: Add these "additional pages" as a feature to the individual content types
  if (config.features.video) {
    router.get('/streams', function (req, res, next) {
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
    });
  }

  return router;
};
