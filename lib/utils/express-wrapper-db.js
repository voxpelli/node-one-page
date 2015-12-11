'use strict';

module.exports = function (ExpressWrapper, ExpressConfig) {
  ExpressConfig = ExpressConfig || ExpressWrapper.ExpressConfig;

  const protoProps = {};

  protoProps.constructor = function () {
    ExpressWrapper.apply(this, arguments);

    this.knex = require('knex')({
      client : 'pg',
      connection : this.config.db + (this.config.dbSSL ? '?ssl=true' : ''),
      pool : {
        min: 0,
      },
    });
    this.on('closed', () => this.knex.destroy());
  };

  const staticProps = {};

  staticProps.dbDependencies = {
    // 'prefix-of-child': 'foo',
  };

  staticProps.knexConfig = function (env) {
    var config = this.ExpressConfig.getConfig(undefined, this.envConfigPrefix);
    var db = {
      client: 'pg',
      connection: config.db + (config.dbSSL ? '?ssl=true' : ''),
      migrations: {
        dependencies: this.dbDependencies,
        install: __dirname + '/../install-schema',
        directory: __dirname + '/../../migrations',
      },
    };

    return env ? db : {
      development: db,
      staging: db,
      production: db,
    };
  };

  staticProps.runMigrationTask = function (command, returnPromise) {
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

    var env = this.ExpressConfig.getConfig(undefined, this.envConfigPrefix).env;
    var knexConfig = this.knexConfig(env);
    var knex = require('knex')(knexConfig);
    var migrator = require('knex-migrator-extension')(knex);

    var result = migrator[command]();

    if (returnPromise) {
      return result;
    }

    result
      .then(function () {
        console.log('Success!');
        process.exit(0);
      })
      .catch(function (err) {
        console.error('Migration failed:', err.message, err.stack);
        process.exit(1);
      });
  };

  staticProps.ExpressConfig = ExpressConfig.staticExtend({
    testDatabase: 'postgres://postgres@localhost/vp_express_wrapper_test',
    _mapEnvToConfig: function (env, prefix) {
      let config = ExpressConfig._mapEnvToConfig.call(this, env, prefix);

      return Object.assign(config, {
        db: (
          env.NODE_ENV === 'test'
          ? env.DATABASE_TEST_URL || this.testDatabase
          : env.DATABASE_URL
        ),
        dbSSL: env[prefix + 'DATABASE_SSL'],
      });
    },
  });

  return ExpressWrapper.extend(protoProps, staticProps);
};
