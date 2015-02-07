/* jshint node: true */
/* global -Promise */

'use strict';

var config = require('./app.js').getDefaultConfig()
  , knex = require('knex')({ client: 'pg', connection: config.db })
  , Promise = require('promise')
  , install;

install = function () {
  console.log('Creating tables...');

  return Promise.all([

    // *** Schema definition ***

    knex.schema.createTable('accounts', function (table) {
      table.increments('id').notNullable().primary();
      table.string('service').notNullable();
      table.string('identifier').notNullable();
      table.string('external_id');
      table.string('role', true).notNullable().defaultTo('admin');
      table.timestamp('lastlogin', true);

      table.unique(['service', 'identifier']);
      table.unique(['service', 'external_id']);
    }),

    knex.schema.createTable('session', function (table) {
      table.string('sid').primary();
      table.json('sess').notNullable();
      table.timestamp('expire', true).notNullable();
    }),

    knex.schema.createTable('agenda', function (table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.time('start');
      table.time('stop');
      table.string('speaker');
      table.string('description');
      table.integer('category').notNullable().defaultTo(0);
      table.timestamp('created', true).notNullable().defaultTo(knex.raw('NOW()'));
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
    }),

    knex.schema.createTable('speakers', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('description');
      table.json('links');
      table.string('image');
      table.timestamp('created', true).notNullable().defaultTo(knex.raw('NOW()'));
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
    }),

    knex.schema.createTable('vars', function (table) {
      table.string('key').primary();
      table.json('value').notNullable();
      table.timestamp('modified', true).notNullable().defaultTo(knex.raw('NOW()'));
    }),

    // *** End of schema definition ***

  ]).then(function () {
    // This ensures that all existing migrations gets marked as complete so that only new ones will be applied

    // When/if https://github.com/tgriesser/knex/pull/617 goes through change to the below oneliner instead
    // return knex.migrate.fastForward();

    console.log('...initializes migrations table...');

    var setInitialMigrationState
      , originalCwd = process.cwd();

    process.chdir(__dirname + '/..');

    // This initializes the migrator – taken from Knex main file
    if (!knex.client.Migrator) {
      knex.client.initMigrator();
    }
    var migrator = new knex.client.Migrator(knex);

    // Own code to tell that the new schema already is up to date
    setInitialMigrationState = function (config) {
      this.config = this.setConfig(config);
      return this._migrationData()
        .bind(this)
        .then(function (result) {
          var migrations = [],
            migration_time = new Date();

          result[0].forEach(function (migration) {
            migrations.push({
              name: migration,
              batch: 0,
              migration_time: migration_time
            });
          });

          process.chdir(originalCwd);

          return knex(this.config.tableName).insert(migrations);
        });
    };

    return setInitialMigrationState.call(migrator);
  }).then(function () {
    console.log('...success!');
  }).then(undefined, function (err) {
    console.error('...failed with error:', err);
    throw err;
  });
};

if (require.main !== module) {
  module.exports = install;
} else {
  install().then(undefined, function () {}).then(function () {
    knex.destroy();
  });
}
