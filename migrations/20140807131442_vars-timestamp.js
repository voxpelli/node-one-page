'use strict';

exports.up = function (knex) {
  return knex.schema.table('vars', function (table) {
    table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
  });
};

exports.down = function (knex) {
  return knex.schema.table('vars', function (table) {
    table.dropColumn('modified');
  });
};
