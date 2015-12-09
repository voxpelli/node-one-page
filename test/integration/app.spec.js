'use strict';

const request = require('supertest-as-promised');
const logger = require('bunyan-adaptor')({
  verbose: function () {},
});

describe('Node One Page – Main', function () {
  const VTOnePage = require('../../');
  const dbUtils = require('../db-setup');

  let config;
  let appInstance;
  let app;

  beforeEach(function () {
    config = VTOnePage.ExpressConfig.getConfig({});
    appInstance = new VTOnePage(config, {
      logger: logger,
    });
    app = appInstance.getApp();

    return dbUtils.setup(appInstance);
  });

  afterEach(function () {
    return appInstance.close();
  });

  describe('basic', function () {
    it('should return a web page on the "/" path', function () {
      return request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8');
    });
  });
});
