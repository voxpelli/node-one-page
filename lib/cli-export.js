'use strict';

module.exports = function (OnePage) {
  const http = require('http');
  const bunyan = require('bunyan');
  const dashdash = require('dashdash');
  const filendir = require('filendir');
  const copyFile = require('quickly-copy-file');
  const request = require('request');

  const options = [
    {
      names: ['help', 'h'],
      type: 'bool',
      help: 'Print this help and exit.',
    },
  ];

  const parser = dashdash.createParser({ options });

  let opts;

  try {
    opts = parser.parse(process.argv);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }

  const defaultPath = 'export';

  if (opts.help) {
    const help = parser.help().trimRight();
    console.log(
      '\n' +
      'Usage: ./path/to/cli.js <path to target folder>\n\n' +
      'Defaults to ' + defaultPath + ' as target folder.\n\n' +
      'Options:\n' +
      help +
      '\n'
    );
    process.exit(0);
  }

  const targetPath = opts._args[0] || defaultPath;
  const config = OnePage.ExpressConfig.getConfig(undefined, OnePage.envConfigPrefix);
  const page = new OnePage(config, {});

  let server = {};
  let port;

  page.getExportablePages()
    .then(exportablePages => {
      server = http.createServer(page.getApp());
      port = Math.floor(Math.random() * 8000 + 1000);

      return new Promise(resolve => {
        server.listen(port, () => {
          page.emit('started');
          resolve(exportablePages);
        });
      });
    })
    .then(exportablePages => Promise.all(exportablePages.map(path => new Promise((resolve, reject) => {
      request('http://127.0.0.1:' + port + path, (err, response, body) => {
        if (!err && response.statusCode === 200) {
          const target = targetPath + (path.substr(-1) === '/' ? path.substr(0, -1) : path) + '/index.html';
          resolve({ target, body });
        } else {
          reject(err instanceof Error ? err : new Error('Encountered an error'));
        }
      });
    }))))
    .then(data => Promise.all(data.map(item => {
      console.log('Writing', item.target);

      return new Promise((resolve, reject) => {
        filendir.writeFile(item.target, item.body, err => {
          err ? reject(err) : resolve();
        });
      });
    })))
    .then(data => page.getStaticFiles())
    .then(staticFiles => Promise.all(Object.keys(staticFiles).map(file => {
      const target = targetPath + '/' + file;
      console.log('Copying', target);
      return copyFile(staticFiles[file], target);
    })))
    .then(() => {
      console.log('Complete!');
      process.exit(0);
    })
    .catch(err => {
      console.log('Encountered an error:', err, err.message, bunyan.stdSerializers.err(err).stack);
      process.exit(1);
    });
};
