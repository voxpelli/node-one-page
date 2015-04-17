/* jshint node: true */

'use strict';

module.exports.knexConfig = function (env) {
  var db = {
    client: 'pg',
    connection: this.getDefaultConfig().db,
    migrations: {
      dependencies: {
        // 'prefix-of-child': 'foo',
      },
      install: __dirname + '/install-schema',
      directory: __dirname + '/../migrations',
    },
  };

  return env ? db : {
    development: db,
    staging: db,
    production: db,
  };
};

module.exports.runMigrationTask = function (command) {
  command = command || process.argv[1];

  var commands = {
    install: 'install',
    migrate: 'latest',
    rollback: 'rollback',
  };

  if (!command || !commands[command]) {
    process.exit(1);
  }

  command = commands[command];

  var env = this.getDefaultConfig().env;
  var knexConfig = this.knexConfig(env);
  var knex = require('knex')(knexConfig);
  var migrator = require('knex-migrator-extension')(knex);

  migrator[command]()
    .then(function () {
      console.log('Success!');
      process.exit(0);
    })
    .catch(function (err) {
      console.error('Migration failed:', err.message, err.stack);
      process.exit(1);
    });
};
