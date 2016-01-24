'use strict';

var ContentType = require('../../').BaseType;
var _ = require('lodash');
var cloudinary = require('cloudinary');
var forms = require('forms');
var fields = forms.fields;

module.exports = ContentType.extend({
  constructor : function (options) {
    options = options || {};
    if (!options.key) {
      throw new Error('Variable key must be set');
    }

    this.variableKey = options.key;
    this.help = options.help;
    this.isMultiPage = !!options.multipage;

    ContentType.call(this, _.extend({ id : this.variableKey }, options));
  },
  supportsMultiPage: function () {
    return this.isMultiPage;
  },
  getDataQuery : function (page) {
    return this.knex('vars')
      .first('value')
      .where({
        key: this.variableKey,
        page: this.supportsMultiPage() ? page || 0 : 0,
      })
      .then(function (row) {
        return row ? row.value : undefined;
      });
  },
  getFormSettings : function () {
    return {
      key : fields.string({ required: true, widget: forms.widgets.hidden() }),
      modified : fields.string({ widget: forms.widgets.hidden() }),
    };
  },
  deleteByPage: function (page) {
    return this.knex('vars').where({
      key: this.variableKey,
      page: page,
    }).delete();
  },
  doPost : function (form, req) {
    var page = req.multipage ? req.multipage.id : 0;
    var fileFields = this.getFileFields();
    var variableKey = form.data.key;
    var variableModified = form.data.modified;
    var variableValue;
    var knex = this.knex;

    delete form.data.key;
    delete form.data.modified;

    variableValue = form.data;

    return (fileFields ? knex('vars').first('value').where('key', variableKey) : Promise.resolve())
      .then(function (variable) {
        if (variable && variable.value) {
          _.each(variable.value, function (fieldValue, fieldName) {
            if (fileFields[fieldName] && fieldValue) {
              if (variableValue[fieldName]) {
                cloudinary.uploader.destroy(fieldValue, function (result) {
                  console.log('Image destruction:', result);
                });
              } else {
                variableValue[fieldName] = fieldValue;
              }
            }
          });
        }

        var query = knex('vars').where({
          key: variableKey,
          page: page,
        });

        if (!fileFields && variableModified) {
          query = query.whereRaw('EXTRACT(EPOCH FROM modified)::integer = ?', parseInt(variableModified, 10));
        }

        return query.update({
          value: variableValue,
          modified: knex.raw('NOW()'),
        });
      })
      .then(function (affectedRows) {
        if (!affectedRows) {
          return knex('vars').insert({
            page: page,
            key: variableKey,
            value: variableValue,
          }).then(undefined, function (err) {
            if (parseInt(err.code, 10) !== 23505) {
              err.form = form;
              throw err;
            }
            err = new Error("Couldn't save due to a data conflict. Someone else probably updated the same thing as you at the same time.");
            err.name = 'ConflictError';
            err.form = form;
            throw err;
          });
        }
      });
  },
  getFormData : function (currentPage) {
    var variableKey = this.variableKey;

    return this.knex('vars')
      .first('value', this.knex.raw('EXTRACT(EPOCH FROM modified)::integer as modified'))
      .where({
        key: variableKey,
        page: currentPage || 0,
      })
      .then(function (variable) {
        variable = variable || {};

        var variableModified = variable.modified || null;

        variable = variable.value || {};

        variable.key = variableKey;
        variable.modified = variableModified;

        return variable;
      });
  },
});
