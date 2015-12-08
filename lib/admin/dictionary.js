'use strict';

var VarsType = require('../../').VarsType;
var _ = require('lodash');
var forms = require('forms');
var fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({ key : 'dictionary' }, options || {}));

    this.permission = 'administer site';
  },
  isDefaultTemplateData : function () {
    return true;
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);
    var config = this.config();

    _.each(config.admin.dictionary, function (value, key) {
      if (value[2] && !config.features[value[2]]) {
        return;
      }
      formSettings[key] = fields.string({
        label: value[0],
        widget: forms.widgets.text({ placeholder: value[1] }),
      });
    });

    return formSettings;
  },
});
