'use strict';

const util = require('util');
const EventEmitter = require('events');

const express = require('express');

var extend = require('backbone-extend-standalone');
var forms = require('forms');
var cloudinary = require('cloudinary');
var ContentType;
var ensureAuthenticated;

const pubSubEvent = require('../utils/pubsubevent');

// Custom Middleware
ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/admin/login');
};

// Object definition

ContentType = function (options) {
  EventEmitter.call(this);

  options = options || {};

  this.name = options.name;
  this.singularName = options.singularName;

  if (options.id) {
    this.id = this.id || options.id.replace(/[\W_]/, '').toLowerCase();

    this.path = this.path || ('/' + this.id);
    this.hash = this.hash || ('#' + this.id);
    this.formName = this.formName || (this.id + 'Form');
  }

  this.on('updated', data => this.updatedEvent(data));
};

util.inherits(ContentType, EventEmitter);

ContentType.extend = extend;

// Object properties

Object.assign(ContentType.prototype, pubSubEvent);

ContentType.prototype.updatedEvent = function (data) {
  this.getData(data.page, true);
};

ContentType.prototype.config = function () {
  return this.page.config;
};

ContentType.prototype.setPage = function (page) {
  this.page = page;
  this.knex = page.knex;

  this.initPubSubEvent(page.pubsub, this.id);

  return this;
};

ContentType.prototype.setAdminPageAssemble = function (assembleAdminPage) {
  this.assembleAdminPage = assembleAdminPage;
  return this;
};

ContentType.prototype.getAdminRoutes = function () {
  if (this.adminRoutes) { return this.adminRoutes; }

  let router = express.Router({
    caseSensitive: true,
    strict: true,
  });

  this.adminRoutes = router;

  router.get(this.path, function (req, res) {
    res.redirect(this.getBaseUrl(req));
  });

  router.post(this.path, ensureAuthenticated, this.handlePost.bind(this));

  if (this.getPath) {
    router.get(this.path + (this.getPath === true ? '/:id' : this.getPath), ensureAuthenticated, this.handleGet.bind(this));
  }

  if (this.deletePath) {
    router.delete(this.path + (this.deletePath === true ? '/:id' : this.deletePath), ensureAuthenticated, this.handleDelete.bind(this));
  }

  return router;
};

ContentType.prototype.getId = function () {
  return this.id;
};

ContentType.prototype.getName = function () {
  return this.name || '';
};

ContentType.prototype.getSingularName = function () {
  return this.singularName || this.getName();
};

ContentType.prototype.getHelp = function () {
  return this.help;
};

ContentType.prototype.getRequiredPermission = function () {
  return this.permission || 'edit content';
};

ContentType.prototype.getRoutes = function () {
  return {};
};

ContentType.prototype.supportsMultiPage = function () {
  return false;
};

ContentType.prototype.getBaseUrl = function (req) {
  return '/admin' + (req.multipage ? '/' + req.multipage.id : '');
};

ContentType.prototype.getDataQuery = function () {
  return Promise.resolve();
};

ContentType.prototype.getData = function (page, reset) {
  let cacheKey = 'contentType::' + this.id;

  page = page || 0;

  if (this.supportsMultiPage() && page) {
    cacheKey += '::' + page;
  }

  let cache = this.page.cache(cacheKey);

  if (cache && !reset) {
    this.page.logger.debug({ contentType: this.id, page: this.supportsMultiPage() ? page : null }, 'Found cached data for content type');
    return cache;
  }

  this.page.logger.debug({ contentType: this.id, page: this.supportsMultiPage() ? page : null }, 'Looking up new data for content type');

  let result = this.getDataQuery(page)
    .catch(err => {
      this.page.logger.error(err, 'Failed to load data for', this.id);

      let fallback = this.page.fallback(cacheKey);

      if (!fallback) {
        throw err;
      }

      return fallback;
    });

  // If we have a success, then save the data if the next fetch is a failure, but that don't have to be chained
  result.then(results => this.page.fallback('cacheKey', results));
  this.page.cache(cacheKey, result);

  return result;
};

ContentType.prototype.isDefaultTemplateData = function () {
  return false;
};

ContentType.prototype.getTemplate = function () {
  return false;
};

ContentType.prototype.getFileFields = function () {
  return false;
};

ContentType.prototype.getFormGroup = function () {
  return false;
};

ContentType.prototype.getFormTemplate = function () {
  let formTemplate = this.formTemplate;

  if (formTemplate === undefined) {
    formTemplate = 'admin-form';
  }

  return formTemplate ? { template : formTemplate } : false;
};

ContentType.prototype.getFormListTemplate = function () {
  if (!this.formListTemplate) { return false; }

  let template = { template : this.formListTemplate === true ? 'admin-list' : this.formListTemplate };

  let features = Object.assign({
    link: false,
    modified: !!this.trackModify,
  }, this.formListFeatures || {});

  if (features.actions !== false) {
    features.actions = Object.assign({
      edit: !!this.getPath,
      delete: !!this.deletePath,
    }, features.actions === true ? {} : features.actions);
  }

  template.path = this.path;
  template.hash = this.hash;
  template.features = features;
  template.columns = this.formListColumns || [];

  return template;
};

ContentType.prototype.getFormWrapper = function (data) {
  return {
    templateWrappers : ['admin-section'],
    sectionId : data.id,
    sectionMenu : data.name,
  };
};

ContentType.prototype.getFormSettings = function () {};

ContentType.prototype.getForm = function (formData) {
  if (formData === false) {
    if (this.noAddForm === true) {
      return false;
    }
    formData = undefined;
  }
  if (this.form === undefined) {
    let formSettings = this.getFormSettings();
    this.form = formSettings ? forms.create(formSettings) : false;
  }
  return formData && this.form ? this.form.bind(formData) : this.form;
};

ContentType.prototype.getFormTemplateData = function (currentPage) {
  return Promise.all([
    this.getList(currentPage),
    this.getFormData(currentPage),
  ]).then(result => {
    let form = this.getForm(result[1] || false);
    let listData = result[0];

    if (!form && !listData) { return false; }

    return {
      id : this.getId(),
      name : this.getName(),
      singularName : this.getSingularName(),
      help : this.getHelp(),
      list : listData,
      form : form,
      multipart : this.getFileFields() !== false,
      formName : this.formName,
    };
  });
};

ContentType.prototype.getList = function (currentPage) {
  let result;

  if (this.table && this.formListTemplate === true) {
    result = this.knex(this.table).select('*');

    if (this.supportsMultiPage()) {
      result = result.where('page', currentPage || 0);
    }

    if (this.formListFeatures && this.trackModify && this.formListFeatures.modified !== false) {
      result = result.orderBy('modified', 'desc');
    }
  } else {
    result = Promise.resolve();
  }

  return result;
};

ContentType.prototype.getFormData = function () {
  return Promise.resolve();
};

ContentType.prototype.handlePost = function (req, res, next) {
  var that = this;
  var fileFields = this.getFileFields();
  var fields = {};
  var filesLeft = 0;
  var completed = false;
  var complete;

  complete = function (fields) {
    var form = that.getForm();

    form.handle(fields, {
      success: successForm => {
        that
          .doPost(successForm, req)
          .then(() => that.emitOverPubSub('updated', {
            page: req.multipage ? req.multipage.id : null,
          }))
          .then(() => res.redirect(that.getBaseUrl(req) + (that.hash || '')))
          .catch((err) => {
            if (err.form) {
              var params = {};
              err.form.handlingError = err.message;
              params[that.formName] = err.form;
              that.assembleAdminPage(req, res, next, params);
            } else {
              next(err);
            }
          });
      },
      error: function (form) {
        var params = {};
        params[that.formName] = form;
        that.assembleAdminPage(req, res, next, params);
      },
    });
  };

  if (fileFields) {
    req.busboy.on('file', function (fieldname, file) {
      if (!fileFields[fieldname]) {
        return;
      }

      filesLeft += 1;

      var callback, options, stream;

      callback = function (result) {
        if (!result.error && result.public_id) {
          fields[fieldname] = result.public_id;
        }

        filesLeft -= 1;
        if (filesLeft < 1 && completed) {
          complete(fields);
        }
      };

      options = fileFields[fieldname];

      stream = cloudinary.uploader.upload_stream(callback, options);

      file.on('data', stream.write.bind(stream));
      file.on('end', stream.end.bind(stream));
    });
  }

  req.busboy.on('field', function (key, value) {
    fields[key] = value;
  });

  req.busboy.on('finish', function () {
    if (filesLeft < 1) {
      complete(fields);
    } else {
      completed = true;
    }
  });

  req.pipe(req.busboy);
};
ContentType.prototype.handleGet = function (req, res, next) {
  this.doGet(this.getPath === true ? req.params.id : req.params)
    .then(function (content) {
      if (!content) {
        var error = new Error("Couldn't find the specified object");
        error.status = 404;
        throw error;
      } else {
        var params = {};
        params[this.formName] = this.getForm(content);
        this.assembleAdminPage(req, res, next, params);
      }
    }.bind(this))
    .then(undefined, next);
};
ContentType.prototype.handleDelete = function (req, res, next) {
  var baseUrl = this.getBaseUrl(req);
  var hash = this.hash;

  this.doDelete(this.deletePath === true ? req.params.id : req.params).then(function (affectedRows) {
    res.format({
      html: function () {
        if (!affectedRows) {
          var error = new Error("Couldn't find the specified object");
          error.status = 404;
          throw error;
        }
        res.redirect(baseUrl + (hash || ''));
      },
      json: function () {
        var response = {};
        var responseCode = 200;

        if (!affectedRows) {
          response.error = true;
          responseCode = 404;
        } else {
          response.success = true;
        }
        res.status(responseCode).json(response);
      },
    });
  }).then(undefined, next);
};

ContentType.prototype.doPost = function (data, req) {
  if (this.table) {
    data = Object.assign({}, data.data || data);

    let id = data.id;

    delete data.id;

    if (id) {
      if (this.trackModify) {
        data.modified = this.knex.raw('NOW()');
      }

      return this.knex(this.table).where('id', id).update(data);
    } else {
      return this.knex(this.table).insert(data);
    }
  }

  console.warn('Should implement doPost()');
  return Promise.reject(new Error("Couldn't perform post"));
};
ContentType.prototype.doGet = function (id) {
  if (this.table && this.getPath === true) {
    return this.knex(this.table).first('*').where('id', id);
  }

  console.warn('Should implement doGet()');
  return Promise.reject(new Error("Couldn't perform get"));
};
ContentType.prototype.doDelete = function (id) {
  if (this.table && this.deletePath === true) {
    return this.knex(this.table).where('id', id).delete();
  }

  console.warn('Should implement doDelete()');
  return Promise.reject(new Error("Couldn't perform deletion"));
};
ContentType.prototype.deleteByPage = function (id) {
  if (this.table && this.supportsMultiPage()) {
    return this.knex(this.table).where('page', id).delete();
  }

  console.warn('Should implement deleteByPage()');
  return Promise.reject(new Error("Couldn't perform page based deletion"));
};

module.exports = ContentType;
