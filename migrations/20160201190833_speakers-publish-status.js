'use strict';

exports.up = function (knex) {
  return knex.schema.table('speakers', function (table) {
    table.boolean('published').notNullable().defaultTo(true).index();
  });
};

exports.down = function (knex) {
  return knex.schema.table('speakers', function (table) {
    table.dropColumn('published');
  });
};
