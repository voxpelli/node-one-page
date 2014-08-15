/*jslint node: true, white: true, indent: 2 */

"use strict";

var VarsType = require('./vars')
  , _ = require('lodash')
  , forms = require('forms')
  , fields = forms.fields;

module.exports = VarsType.extend({
  constructor : function (options) {
    options = options || {};

    this.syntaxhighlight = options.syntaxhighlight || false;

    VarsType.call(this, options);
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      header: fields.string({ label: 'Rubrik' }),
      body: fields.string({
        label: 'Text',
        widget: forms.widgets.textarea({
          classes : this.syntaxhighlight ? ['syntax-highlight', 'syntax-highlight-' + this.syntaxhighlight] : []
        })
      })
    });

    return formSettings;
  }
});
