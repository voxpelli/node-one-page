'use strict';

var request = require('supertest-as-promised');
var dbUtils = require('../db-setup');

describe('Node One Page – Admin', function () {
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
    it('should redirect to login on the "/admin" path', function () {
      return request(app)
        .get('/admin')
        .expect(302)
        .expect('Location', '/admin/login');
    });

    it('should return a web page on the "/admin/login" path', function () {
      return request(app)
        .get('/admin/login')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8');
    });
  });

  describe('authentication', function () {
    it('should return a web page on the "/admin/login" path', function () {
      var agent = request.agent(app);

      return agent
        .post('/admin/auth/dummy')
        .expect(302)
        .expect('Location', '/admin')
        .then(function () {
          return agent
            .get('/admin')
            .expect(200)
            .expect('Content-Type', 'text/html; charset=utf-8');
        });
    });
  });
});
