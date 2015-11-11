/* jshint node: true */

'use strict';

var VarsType = require('./vars');
var _ = require('lodash');
var forms = require('forms');
var fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    VarsType.call(this, _.extend({
      name : 'Layout',
      key : 'sirtrevor',
    }, options || {}));
  },
  getTemplate : function (data) {
    data = this.getVarFromData(data);

    if (!data.body) {
      return false;
    }

    var subChildren = [];

    //TODO: Remake into a sirtrevor type which resolves these subChildren through an added preRenders function
    _.each(data.body, function (content, index) {
      subChildren.push({
        templateWrappers : 'front-section',
        template : 'sirtrevor-block',
        variables : {
          name : 'block-' + index,
          cssClasses : ['block', 'block-' + (index % 2 ? 'odd' : 'even')],
          content : content,
        },
      });
    });

    return subChildren[0] ? {
      templateWrappers : 'blocks',
      children : subChildren,
    } : false;
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      body: fields.string({
        widget: forms.widgets.textarea({
          classes : ['sir-trevor'],
        }),
      }),
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
  },
});
