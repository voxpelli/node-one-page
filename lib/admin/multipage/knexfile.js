'use strict';

module.exports = {};
module.exports[process.env.NODE_ENV] = {
  migrations: {
    install: __dirname + '/install-schema',
    directory: __dirname + '/migrations',
  },
};
