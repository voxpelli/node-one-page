/*jslint node: true, white: true, indent: 2 */

"use strict";

var VarsType = require('./vars')
  , _ = require('lodash')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({ key : 'dictionary' }, options || {}));

    this.permission = 'administer site';
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this)
      , config = this.config();

    _.each(config.admin.dictionary, function (value, key) {
      if (value[2] && !config.features[value[2]]) {
        return;
      }
      formSettings[key] = fields.string({
        label: value[0],
        widget: forms.widgets.text({ placeholder: value[1] })
      });
    });

    return formSettings;
  }
});
