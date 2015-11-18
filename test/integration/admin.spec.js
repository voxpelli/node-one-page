'use strict';

var chai = require('chai');
var request = require('supertest-as-promised');

chai.should();

describe('Node One Page – Admin', function () {
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
    it('should be able to log in with the Dummy strategy', function () {
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

  describe('/admin', function () {
    var agent;

    beforeEach(function () {
      agent = request.agent(app);

      return agent
        .post('/admin/auth/dummy')
        .expect(302)
        .expect('Location', '/admin');
    });

    it('should return a HTML page', function () {
      return request(app)
        .get('/admin')
        .expect(302)
        .expect('Location', '/admin/login');
    });

    it('should have a <form>-tag in it', function () {
      return agent
        .get('/admin')
        .expect(200)
        .then(function (res) {
          res.text.should.match(/<form[^>]+>/);
        });
    });
  });
});
