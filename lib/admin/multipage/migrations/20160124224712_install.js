'use strict';

exports.up = require('../install-schema');

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pages');
};
