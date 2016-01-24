'use strict';

exports.up = function (knex) {
  return knex.schema.table('speakers', function (table) {
    table.integer('page').notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.table('speakers', function (table) {
    table.dropColumn('page');
  });
};
