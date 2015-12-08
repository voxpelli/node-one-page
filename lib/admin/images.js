'use strict';

var VarsType = require('../../').VarsType;
var _ = require('lodash');
var cloudimage = require('../utils/cloudimage');
var formsUtil = require('../utils/forms');
var forms = require('forms');
var fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({ key : 'images' }, options || {}));
  },
  isDefaultTemplateData : function () {
    return true;
  },
  getFileFields : function () {
    var fileFields = {};
    var baseOptions;

    baseOptions = {
      tags: ['basic'],
      crop: 'limit',
      eager: [],
    };

    _.each(this.config().admin.images, function (value, key) {
      fileFields[key] = _.extend({}, baseOptions, value[1] || {});
      fileFields[key].eager = _.union(fileFields[key].eager, [cloudimage.preset.thumb]);
    });

    return fileFields;
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.each(this.config().admin.images, function (value, key) {
      value[2] = value[2] || {};
      formSettings[key] = fields.string({
        label: value[0],
        widget: formsUtil.widgets.image(),
      });
    });

    return formSettings;
  },
});
