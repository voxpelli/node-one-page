'use strict';

exports.up = function (knex) {
  return knex
    .raw('ALTER TABLE "vars" DROP CONSTRAINT "vars_pkey"')
    .catch(function () {
      // Ignore the error
    })
    .then(() => knex.schema.table('vars', function (table) {
      table.integer('page').notNullable().defaultTo(0);
      table.primary(['key', 'page']);
    }));
};

exports.down = function (knex) {
  return knex
    .raw('ALTER TABLE "vars" DROP CONSTRAINT "vars_pkey"')
    .catch(function () {
      // Ignore the error
    })
    .then(() => knex.schema.table('vars', function (table) {
      table.dropColumn('page');
    }));
};
