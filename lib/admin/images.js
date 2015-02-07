/* jshint node: true */
/* global -Promise */

'use strict';

var VarsType = require('./vars')
  , _ = require('lodash')
  , cloudimage = require('../utils/cloudimage')
  , formsUtil = require('../utils/forms')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({ key : 'images' }, options || {}));
  },
  getFileFields : function () {
    var fileFields = {}, baseOptions;

    baseOptions = {
      tags: [ 'basic' ],
      crop: 'limit',
      eager: []
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
  }
});
