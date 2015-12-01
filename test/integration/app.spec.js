'use strict';

var request = require('supertest-as-promised');

describe('Node One Page – Main', function () {
  var VTOnePage = require('../../');
  var dbUtils = require('../db-setup');

  var config;
  var appInstance;
  var app;

  beforeEach(function () {
    config = VTOnePage.ExpressConfig.getConfig({});
    appInstance = new VTOnePage(config);
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
