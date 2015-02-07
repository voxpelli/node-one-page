/* jshint node: true */
/* global -Promise */

'use strict';

var VarsType = require('./vars')
  , _ = require('lodash')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, options);
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      key: fields.string({ required: true, widget: forms.widgets.hidden() }),
      name: fields.string({ label: 'Namn' }),
      url: fields.string({ label: 'Url' }),
      note: fields.string({ label: 'Notis' }),
      published: fields.number({ required: true, label: 'Publicerad', choices: {0: 'Nej', 1: 'Ja'}, widget: forms.widgets.select() })
    });

    return formSettings;
  },
  getFormData : function () {
    return VarsType.prototype.getFormData.call(this).then(function (data) {
      data.published = data.published ? "1" : "0";
      return data;
    });
  }
});
