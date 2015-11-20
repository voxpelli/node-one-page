'use strict';

// Avoid running tests in non-test environments
if (process.env.NODE_ENV !== 'test') {
  console.error('To avoid accidental damage these tests will refuse to run when NODE_ENV is set to something else than "test".');
  process.exit(1);
}

var VTOnePage = require('../');

// Tables with relations between each other needs special treatment – needs to be deleted in order
var tables = [
];

module.exports = {
  setup : function () {
    var knexConfig = VTOnePage.knexConfig(process.env.NODE_ENV);
    var knex = require('knex')(knexConfig);

    return this.clearDb(knex)
      .then(() => this.setupSchema())
      .then(() => this.setupSampleData(knex))
      .then(() => knex.destroy());
  },

  clearDb : function (knex) {
    var dropTable = function (tableName) {
      return knex.schema.dropTableIfExists(tableName);
    };

    return tables
      .reduce(
        (deleteChain, tableName) => deleteChain.then(dropTable.bind(undefined, tableName)),
        Promise.resolve()
      )
      .then(function () {
        // Fallback in case we missed a table
        return knex('information_schema.tables')
          .select('table_name')
          //TODO: Parse the schema from the config?
          .where('table_schema', 'public')
          .pluck('table_name');
      })
      .then(tableNames => Promise.all(tableNames.map(dropTable)));
  },

  setupSchema : function () {
    return VTOnePage.runMigrationTask('install', true);
  },

  setupSampleData : function (knex) {
    return Promise.all([
    ]);
  },
};
