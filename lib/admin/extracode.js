/* jshint node: true */

'use strict';

var VarsType = require('./vars')
  , _ = require('lodash')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, options);

    this.permission = 'administer site';
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      body: fields.string({
        label: 'Kod',
        widget: forms.widgets.textarea({
          classes : ['syntax-highlight', 'syntax-highlight-css']
        })
      })
    });

    return formSettings;
  }
});
