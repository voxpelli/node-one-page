'use strict';

module.exports = function (OnePage, exportOptions) {
  exportOptions = exportOptions || {};

  const http = require('http');
  const fs = require('fs');
  const crypto = require('crypto');
  const pathModule = require('path');
  const bunyan = require('bunyan');
  const cheerio = require('cheerio');
  const dashdash = require('dashdash');
  const filendir = require('filendir');
  const copyFile = require('quickly-copy-file');
  const request = require('request');
  const PromiseQueue = require('promise-queue');

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

  const srcsetParse = function (srcset) {
    return srcset.trim().split(',').map(part => part.trim().split(/[ \t\n\r\0\x0B]+/)).filter(parts => parts[0]);
  };

  const srcsetConstruct = function (srcsetParts) {
    return srcsetParts.map(parts => parts[0] + (parts[1] ? ' ' + parts[1] : '')).join(', ');
  };

  let server = {};
  let port;

  try {
    fs.mkdirSync(targetPath + '/external');
  } catch (e) {}

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
    .then(data => {
      const queue = new PromiseQueue(10);
      const externalUrls = {};

      const fetchUrl = (imageUrl) => {
        if (!externalUrls[imageUrl]) {
          externalUrls[imageUrl] = queue.add(() => new Promise((resolve, reject) => {
            const fileName = '/external/' + crypto.createHash('sha1').update(imageUrl).digest('hex') + pathModule.extname(imageUrl);
            console.log('Exporting external', imageUrl, 'as', fileName);
            request(imageUrl)
              .on('error', err => reject(err))
              .pipe(fs.createWriteStream(targetPath + fileName))
              .on('close', () => resolve(fileName));
          }));
        }
        return externalUrls[imageUrl];
      };

      return Promise.all(data.map(item => {
        const $ = cheerio.load(item.body);
        const allPromises = [];
        (exportOptions.externalDomains || []).forEach(domain => {
          // FIXME: Also parse srcset!
          $('img[src*="' + domain + '"]').each((i, elem) => {
            const $elem = $(elem);
            allPromises.push(fetchUrl($elem.attr('src')).then(newUrl => $elem.attr('src', newUrl)));
          });
          $('img[srcset*="' + domain + '"]').each((i, elem) => {
            const $elem = $(elem);

            allPromises.push(
              Promise.all(
                srcsetParse($elem.attr('srcset'))
                  .map(parts => fetchUrl(parts[0]).then(newUrl => {
                    parts[0] = newUrl;
                    return parts;
                  }))
              )
                .then(srcsetParts => $elem.attr('srcset', srcsetConstruct(srcsetParts)))
            );
          });
        });
        return Promise.all(allPromises)
          .then(() => {
            item.body = $.html();
            return item;
          });
      }));
    })
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
