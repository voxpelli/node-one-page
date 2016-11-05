'use strict';

var VarsType = require('../../').VarsType;
var _ = require('lodash');
var forms = require('forms');
var fields = forms.fields;
var puffMatcher = /^puff/;

module.exports = VarsType.extend({
  constructor : function (options) {
    options = options || {};

    this.extendable = options.extendable || false;
    this.menuName = options.menuName;
    this.plain = options.plain || false;
    this.requireHeader = options.requireHeader || false;
    this.requireBody = options.requireBody === undefined ? !this.requireHeader : options.requireBody;
    this.syntaxhighlight = options.syntaxhighlight || false;
    this.template = options.template || false;

    options.key = 'puff-' + options.key;

    VarsType.call(this, options);
  },
  getTemplate : function (data) {
    data = data || {};

    if (
      (this.requireHeader && !data.header) ||
      (this.requireBody && !data.body)
    ) {
      return false;
    }

    return {
      template : 'puff',
      variables : {
        name : this.id.replace(puffMatcher, ''),
        header : data.header,
        body : data.body,
        extended : this.extendable,
        menuName : this.menuName,
        plain : this.plain,
      },
    };
  },
  getFormGroup : function () {
    return {
      name: 'puffs',
      attributes: {
        sectionId : 'puffintro',
        sectionClass : 'admin-puffs',
        sectionTitle : 'Puffar',
      },
    };
  },
  getFormSettings : function () {
    var formSettings = VarsType.prototype.getFormSettings.call(this);

    _.extend(formSettings, {
      header: fields.string({ label: 'Rubrik' }),
      body: fields.string({
        label: 'Text',
        widget: forms.widgets.textarea({
          classes : this.syntaxhighlight ? ['syntax-highlight', 'syntax-highlight-' + this.syntaxhighlight] : [],
        }),
      }),
    });

    return formSettings;
  },
  getRenderingName: function () {
    if (!this.template) {
      return this.getId();
    }

    // Do some string magic to make template puffs easier to print in template.
    const keyPrefix = 'puff-' + this.template + '-';
    const name = this.variableKey.replace(keyPrefix, '');

    return name;
  }
});
