'use strict';

exports.up = function (knex) {
  return knex.schema.table('agenda', function (table) {
    table.json('data', true);
  });
};

exports.down = function (knex) {
  return knex.schema.table('agenda', function (table) {
    table.dropColumn('data');
  });
};
