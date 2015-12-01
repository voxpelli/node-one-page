'use strict';

var chai = require('chai');
var request = require('supertest-as-promised');

chai.should();

//TODO: Ensure all features are activated no matter the .env

describe('Node One Page – Full Flow', function () {
  var VTOnePage = require('../../');
  var dbUtils = require('../db-setup');

  var config;
  var appInstance;
  var app;
  var agent;

  beforeEach(function () {
    config = VTOnePage.ExpressConfig.getConfig({});
    appInstance = new VTOnePage(config);
    app = appInstance.getApp();
    agent = request.agent(app);

    return dbUtils
      .setup(appInstance)
      .then(function () {
        return agent
          .post('/admin/auth/dummy')
          .expect(302)
          .expect('Location', '/admin');
      });
  });

  afterEach(function () {
    return appInstance.close();
  });

  describe('vars', function () {
    it('should when modified in admin be updated on the front page', function () {
      return Promise.resolve()
        // Ensure the current front page doesn't contain the values we're going to add
        .then(() => agent.get('/').expect(200))
        .then(res => {
          res.text.should.not.contain('Foo');
          res.text.should.not.contain('Bar Ipsum');
        })
        // Ensure the amdin page is accessible
        .then(() => agent.get('/admin').expect(200))
        // Do the change
        .then(() =>
          agent
            .post('/admin/puffintro')
            .type('form')
            .send({
              key: 'puff-intro',
              header: 'Foo',
              body: 'Bar Ipsum',
            })
            .expect(302)
            .expect('Location', '/admin#puffintro')
        )
        // Validate the change
        .then(() => agent.get('/').expect(200))
        .then(res => {
          res.text.should.contain('Foo');
          res.text.should.contain('Bar Ipsum');
        });
    });
  });
});
