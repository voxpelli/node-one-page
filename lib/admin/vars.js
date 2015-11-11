/* jshint node: true, esnext: true */

'use strict';

var ContentType = require('./base');
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

    ContentType.call(this, _.extend({ id : this.variableKey }, options));
  },
  getDataQuery : function () {
    return this.knex('vars')
      .select('key', 'value')
      .map(function (variable) {
        return [variable.key, variable.value];
      })
      .then(function (vars) {
        return _.zipObject(vars);
      });
  },
  getDataKey : function () {
    return 'vars';
  },
  getVarFromData : function (data) {
    return data[this.variableKey] || {};
  },
  getFormSettings : function () {
    return {
      key : fields.string({ required: true, widget: forms.widgets.hidden() }),
      modified : fields.string({ widget: forms.widgets.hidden() }),
    };
  },
  doPost : function (callback, form) {
    var fileFields = this.getFileFields();
    var variableKey = form.data.key;
    var variableModified = form.data.modified;
    var variableValue;
    var knex = this.knex;

    delete form.data.key;
    delete form.data.modified;

    variableValue = form.data;

    (fileFields ? knex('vars').first('value').where('key', variableKey) : Promise.resolve())
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

        var query = knex('vars').where('key', variableKey);

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
      })
      .nodeify(callback);
  },
  getFormData : function () {
    var variableKey = this.variableKey;

    return this.knex('vars')
      .first('value', this.knex.raw('EXTRACT(EPOCH FROM modified)::integer as modified'))
      .where('key', variableKey)
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
