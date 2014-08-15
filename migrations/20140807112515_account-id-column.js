/*jslint node: true, white: true, indent: 2 */


'use strict';

exports.up = function (knex) {
  return knex.transaction(function (trx) {
    return trx.raw('ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey"')
      .then(function () {
        return trx.schema.table('accounts', function (table) {
          table.increments('id').notNullable().primary();
          table.unique(['service', 'identifier']);
        });
      });
  });
};

exports.down = function (knex) {
  return knex.schema.table('accounts', function (table) {
    table.dropColumn('id');
  });
};
