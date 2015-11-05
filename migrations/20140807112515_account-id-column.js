/*jslint node: true, white: true, indent: 2 */


'use strict';

exports.up = function (knex) {
  return knex
    .raw('ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey"')
    .catch(function () {
      // Ignore the error
    })
    .then(function () {
      return knex.schema.table('accounts', function (table) {
        table.increments('id').notNullable().primary();
        table.unique(['service', 'identifier']);
      });
    });
};

exports.down = function (knex) {
  return knex
    .raw('ALTER TABLE "accounts" DROP CONSTRAINT "accounts_service_identifier_unique"')
    .then(function () {
      return knex.schema.table('accounts', function (table) {
        table.dropColumn('id');
      });
    });
};
