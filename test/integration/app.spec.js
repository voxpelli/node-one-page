'use strict';

var request = require('supertest-as-promised');

describe('Node One Page – Main', function () {
  var VTOnePage = require('../../');
  var dbUtils = require('../db-setup');

  var appInstance;
  var app;

  beforeEach(function () {
    appInstance = new VTOnePage();

    app = appInstance.app;

    return dbUtils.setup(appInstance);
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
