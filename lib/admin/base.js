'use strict';

var extend = require('backbone-extend-standalone');
var _ = require('lodash');
var forms = require('forms');
var cloudinary = require('cloudinary');
var ContentType;
var ensureAuthenticated;

// Custom Middleware
ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/admin/login');
};

// Object definition

ContentType = function (options) {
  options = options || {};

  this.name = options.name;

  if (options.id) {
    this.id = this.id || options.id.replace(/[\W_]/, '').toLowerCase();

    this.path = this.path || ('/' + this.id);
    this.hash = this.hash || ('#' + this.id);
    this.formName = this.formName || (this.id + 'Form');
  }
};

ContentType.extend = extend;

// Object properties

ContentType.prototype.config = function () {
  return this.page.config;
};

ContentType.prototype.setPage = function (page) {
  this.page = page;
  this.knex = page.knex;
  return this;
};

ContentType.prototype.setAdminPageAssemble = function (assembleAdminPage) {
  this.assembleAdminPage = assembleAdminPage;
  return this;
};

ContentType.prototype.addToAdmin = function (app) {
  app.get(this.path, function (req, res) {
    res.redirect('/admin');
  });
  app.post(this.path, ensureAuthenticated, this.handlePost.bind(this));
  if (this.getPath) {
    app.get(this.path + (this.getPath === true ? '/:id' : this.getPath), ensureAuthenticated, this.handleGet.bind(this));
  }
  if (this.deletePath) {
    app.delete(this.path + (this.deletePath === true ? '/:id' : this.deletePath), ensureAuthenticated, this.handleDelete.bind(this));
  }
  return this;
};

ContentType.prototype.getId = function () {
  return this.id;
};

ContentType.prototype.getName = function () {
  return this.name || '';
};

ContentType.prototype.getHelp = function () {
  return this.help;
};

ContentType.prototype.getRequiredPermission = function () {
  return this.permission || 'edit content';
};

ContentType.prototype.getDataQuery = function () {
  return Promise.resolve();
};

ContentType.prototype.getDataKey = function () {
  return this.getId();
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
  return { template : this.formTemplate || 'admin-form' };
};

ContentType.prototype.getFormListTemplate = function () {
  return this.formListTemplate ? { template : this.formListTemplate } : false;
};

ContentType.prototype.getFormWrapper = function (data) {
  return {
    templateWrappers : ['admin-section'],
    sectionId : data.id,
    sectionMenu : data.name,
  };
};

ContentType.prototype.getFormSettings = function () {
  console.warn('Should implement getFormSettings()');
};

ContentType.prototype.getForm = function (formData) {
  if (!this.form) {
    this.form = forms.create(this.getFormSettings());
  }
  return formData ? this.form.bind(formData) : this.form;
};

ContentType.prototype.getFormTemplateData = function () {
  return Promise.all([
    this.getList(),
    this.getFormData(),
  ]).then(function (result) {
    return {
      id : this.getId(),
      name : this.getName(),
      help : this.getHelp(),
      list : _.isArray(result[0]) ? result[0] : undefined,
      form : this.getForm(result[1]),
      multipart : this.getFileFields() !== false,
      formName : this.formName,
    };
  }.bind(this));
};

ContentType.prototype.getList = function () {
  return Promise.resolve();
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
          .doPost(successForm)
          .then(() => res.redirect('/admin' + (that.hash || '')))
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
  var hash = this.hash;

  this.doDelete(this.deletePath === true ? req.params.id : req.params).then(function (affectedRows) {
    res.format({
      html: function () {
        if (!affectedRows) {
          var error = new Error("Couldn't find the specified object");
          error.status = 404;
          throw error;
        }
        res.redirect('/admin' + (hash || ''));
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
        res.json(responseCode, response);
      },
    });
  }).then(undefined, next);
};

ContentType.prototype.doPost = function () {
  console.warn('Should implement doPost()');
};
ContentType.prototype.doGet = function () {
  console.warn('Should implement doGet()');
  return Promise.reject(new Error("Couldn't perform get"));
};
ContentType.prototype.doDelete = function () {
  console.warn('Should implement doDelete()');
  return Promise.reject(new Error("Couldn't perform deletion"));
};

module.exports = ContentType;
