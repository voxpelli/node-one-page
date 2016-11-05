'use strict';

const _ = require('lodash');
const express = require('express');

const ContentType = require('../../../').BaseType;
const forms = require('forms');
const fields = forms.fields;

module.exports = ContentType.extend({
  constructor : function (options) {
    options = Object.assign({
      id : 'multipage',
      name : 'Sidor',
      singularName: 'Sida',
    }, options || {});

    ContentType.call(this, options);

    this.table = 'pages';
    this.getPath = true;
    this.deletePath = true;
    this.trackModify = true;
    this.formListTemplate = true;
    this.formListFeatures = {
      modified: true,
      actions: true,
      link: row => '/' + encodeURIComponent(row.path),
      customActions: row => this.getMultiPageContentTypes().length ? [
        { name: 'Hantera', path: '/:id' },
      ] : [],
    };
    this.formListColumns = [
      { title: 'Sökväg', key: 'path', className: 'path' },
      { title: 'Titel', key: 'title', className: 'title' },
    ];
    this.permission = 'administer site';
  },
  getMultiPageContentTypes : function () {
    return _.values(this.page.contentTypes).filter(contentType => contentType.supportsMultiPage());
  },
  getExportablePages: function () {
    return this.knex(this.table)
      .select('path')
      .then(result => result.map(row => '/' + row.path));
  },
  getRoutes: function () {
    var router = express.Router({
      caseSensitive: true,
      strict: true,
    });

    router.param('page', (req, res, next, path) => {
      this.knex(this.table)
        .first('id', 'title', 'template')
        .where('path', path)
        .then(row => {
          if (row) { req.multipage = row; }
          next();
        })
        .catch(next);
    });

    router.get(
      '/',
      this.page.config.features.frontpage
        ? (req, res, next) => this.page.renderPage()
          .then(result => res.send(result))
          .catch(next)
        : (req, res) => res.redirect('/admin')
    );

    router.get('/:page', (req, res, next) => {
      if (!req.multipage) { return next(); }

      this.page.renderPage(req.multipage.id, req.multipage.title, req.multipage.template)
        .then(result => res.send(result))
        .catch(next);
    });

    return {
      '/' : router,
    };
  },
  getAdminRoutes : function () {
    if (this.adminRoutes) { return this.adminRoutes; }

    let router = ContentType.prototype.getAdminRoutes.call(this);

    router.param('page', (req, res, next, id) => {
      if (
        !this.getMultiPageContentTypes().length ||
        /\D/.test(id)
      ) {
        return res.redirect('/admin');
      }

      id = parseInt(id, 10);

      // Front page!
      if (id === 0) {
        req.multipage = {
          id: 0,
          title: 'Front page',
        };

        return next();
      }

      this.knex(this.table)
        .first('id', 'title', 'template')
        .where('id', id)
        .then(row => {
          if (!row) {
            res.sendStatus(404);
          } else {
            req.multipage = row;
            next();
          }
        })
        .catch(next);
    });

    router.use(this.page.adminApp.connectRolesUser.can('edit content'));

    router.get('/:page', (req, res, next) => {
      //TODO: Check for a "supportedContentTypes" array property on the template that matches req.multipage.template and only show those supported content types on the admin page
      this.assembleAdminPage(req, res, next);
    });

    this.getMultiPageContentTypes().forEach(contentType => {
      router.use('/:page', contentType.getAdminRoutes());
    });

    return router;
  },
  getFormSettings : function () {
    let pageTemplates = this.page.getPageTemplates();
    let templateChoices = _.mapValues(pageTemplates, template => template.name);

    let formSettings = {
      id: fields.number({ widget: forms.widgets.hidden() }),
      title: fields.string({ required: true, label: 'Titel', validators: [forms.validators.maxlength(255)] }),
      path: fields.string({
        required: true,
        label: 'Sökväg',
        validators: [
          forms.validators.maxlength(255),
          forms.validators.regexp(/^[a-zA-Z0-9-\/]*$/),
        ],
      }),
    };

    if (!_.isEmpty(templateChoices)) {
      formSettings.template = fields.string({
        required: true,
        label: 'Temamall',
        choices: templateChoices,
        widget: forms.widgets.select(),
      });
    }

    return formSettings;
  },
  doPost : function (form, req) {
    let data = {
      id: form.data.id,
      title: form.data.title,
      path: form.data.path,
      template: form.data.template,
    };

    if (data.path.substr(0, 1) === '/') {
      data.path = data.path.substr(1);
    }

    return ContentType.prototype.doPost.call(this, data, req);
  },
  doDelete : function (id) {
    return ContentType.prototype.doDelete.call(this, id)
      .then(() => Promise.all(
        this.getMultiPageContentTypes().map(
          contentType => contentType.deleteByPage(id)
        )
      ));
  },
});
