'use strict';

var request = require('supertest-as-promised');
var dbUtils = require('../db-setup');

describe('Node One Page – Main', function () {
  var VTOnePage = require('../../');

  var appInstance;

  var app;
  var knex;

  beforeEach(function () {
    appInstance = new VTOnePage();

    app = appInstance.app;
    knex = appInstance.knex;

    return dbUtils.clearDb(knex)
      .then(dbUtils.setupSchema.bind(dbUtils, knex))
      .then(dbUtils.setupSampleData.bind(dbUtils, knex));
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
