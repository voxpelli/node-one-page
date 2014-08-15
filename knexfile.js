var config = require('./lib/app.js').getDefaultConfig()
  , db = { client: 'pg', connection: config.db };

module.exports = {
  development: db,
  staging: db,
  production: db
};
