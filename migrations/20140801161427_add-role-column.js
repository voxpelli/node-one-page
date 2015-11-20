'use strict';

exports.up = function (knex) {
  return knex.schema.table('accounts', function (table) {
    table.string('role', true).notNullable().defaultTo('admin');
  });
};

exports.down = function (knex) {
  return knex.schema.table('accounts', function (table) {
    table.dropColumn('role');
  });
};
