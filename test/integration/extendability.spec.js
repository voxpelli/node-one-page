'use strict';

const request = require('supertest-as-promised');
const logger = require('bunyan-adaptor')({
  verbose: function () {},
});

describe('Node One Page – Extended', function () {
  const VTOnePage = require('../../');
  const dbUtils = require('../db-setup');

  let config;
  let AppClass;
  let appInstance;
  let app;

  const createApp = function (protoProps, staticProps) {
    AppClass = VTOnePage.extend(protoProps, staticProps);
    config = AppClass.ExpressConfig.getConfig({});
    appInstance = new AppClass(config, {
      logger: logger,
    });
    app = appInstance.getApp();

    return dbUtils.setup(appInstance);
  };

  afterEach(function () {
    if (appInstance) {
      return appInstance.close();
    }
  });

  describe('path', function () {
    beforeEach(function () {
      let protoProps = {};

      protoProps.getRoutes = function () {
        let routes = VTOnePage.prototype.getRoutes.call(this);

        routes['/foo'] = (req, res, next) => {
          this
            .render(res)
            .then(result => res.send(result))
            .catch(err => next(err));
        };

        return routes;
      };

      return createApp(protoProps);
    });

    it('should return a web page on extended path', function () {
      return request(app)
        .get('/foo')
        .expect(200)
        .expect('Content-Type', 'text/html; charset=utf-8');
    });
  });
});
