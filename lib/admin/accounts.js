/* jshint node: true */

'use strict';

var ContentType = require('./base');
var _ = require('lodash');
var forms = require('forms');
var fields = forms.fields;

module.exports = ContentType.extend({
  constructor : function (options) {
    this.formName = 'accountForm';

    options = _.extend({
      id : 'accounts',
      name : 'Konton',
    }, options || {});

    ContentType.call(this, options);

    this.deletePath = '/:service/:identifier';
    this.formListTemplate = 'admin-list-accounts';
    this.permission = 'administer site';
    this.validRoles = {admin: 'Admin', editor: 'Användare'};
  },
  getFormSettings : function () {
    //TODO: Add validation?
    var choices = {};

    if (this.config().twitter.key) {
      choices.twitter = 'Twitter';
    }
    if (this.config().github.key) {
      choices.github = 'GitHub';
    }

    return {
      service: fields.string({ required: true, label: 'Tjänst', choices: choices, widget: forms.widgets.select() }),
      role: fields.string({ required: true, label: 'Roll', choices: this.validRoles, widget: forms.widgets.select() }),
      identifier: fields.string({ required: true, label: 'Konto' }),
    };
  },
  getList : function () {
    return this.knex('accounts')
      .select('service', 'identifier', 'role', 'lastlogin')
      .orderBy('identifier', 'asc')
      .orderBy('service', 'asc');
  },
  doDelete : function (params) {
    return this.knex('accounts').where({
      service: params.service,
      identifier: params.identifier,
    }).delete();
  },
  doPost : function (callback, form) {
    this.knex('accounts')
      .insert({
        service: form.data.service,
        identifier: form.data.identifier.toLowerCase(),
        role: this.validRoles[form.data.role.toLowerCase()] ? form.data.role.toLowerCase() : '',
      })
      .nodeify(callback);
  },
});
