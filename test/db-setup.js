'use strict';

var installSchema = require('../lib/install-schema');

// Avoid running tests in non-test environments
if (process.env.NODE_ENV !== 'test') {
  console.error('Will only run in a test environment with NODE_ENV set to "test".');
  process.exit(1);
}

module.exports = {
  clearDb : function (knex) {
    return installSchema.tables.reduce(function (deletionChain, table) {
      return deletionChain.then(knex.schema.dropTableIfExists.bind(knex.schema, table));
    }, Promise.resolve());
  },

  setupSchema : function (knex) {
    return installSchema(knex, Promise);
  },

  setupSampleData : function (knex) {
    return Promise.all([
    ]);
  },
};
