/* jshint node: true */
/* global -Promise */

'use strict';

var VarsType = require('./vars')
  , _ = require('lodash')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({
      name : 'Layout',
      key : 'sirtrevor'
    }, options || {}));
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      body: fields.string({
        widget: forms.widgets.textarea({
          classes : ['sir-trevor']
        })
      })
    });

    return formSettings;
  },
  getForm : function (formData) {
    if (formData) {
      formData.body = formData.body ? JSON.stringify({data: formData.body}) : undefined;
    }
    return VarsType.prototype.getForm.call(this, formData);
  },
  doPost : function (callback, form) {
    try {
      form.data.body = JSON.parse(form.data.body);
      form.data.body = form.data.body.data || [];
    } catch (e) {
      form.data.body = [];
    }

    VarsType.prototype.doPost.call(this, callback, form);
  }
});
