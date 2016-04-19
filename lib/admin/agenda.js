'use strict';

var ContentType = require('../../').BaseType;
var _ = require('lodash');
var forms = require('forms');
var fields = forms.fields;
var validateTime;

validateTime = function (message) {
  if (!message) { message = 'Must be a valid time in the format "HH:MM"'; }
  var splitRegex = /[.,:]/;
  return function (form, field, callback) {
    var parts = field.data ? field.data.split(splitRegex) : [];
    var hours = parseInt(parts[0] || '', 10);
    var minutes = parseInt(parts[1] || '', 10);

    if (!isNaN(hours) && hours >= 0 && hours < 24 && !isNaN(minutes) && minutes >= 0 && minutes < 60) {
      callback();
    } else {
      callback(message);
    }
  };
};

module.exports = ContentType.extend({
  constructor : function (options) {
    options = _.extend({
      id : 'agenda',
      name : 'Agenda',
    }, options || {});

    ContentType.call(this, options);

    this.getPath = true;
    this.deletePath = true;
    this.formListTemplate = 'admin-list-agenda';
  },
  getDataQuery : function () {
    return this.knex('agenda')
      .select('id', 'title', 'description', 'start', 'stop', 'category', 'speaker', 'data')
      .orderBy('start', 'asc')
      .orderBy('category', 'asc')
      .then(items =>
        items.map(item =>
          Object.assign(item, item.data, { data: undefined })
        )
      );
  },
  getTemplate : function (data) {
    return {
      templateWrappers : undefined,
      template : 'agenda',
      agenda : data,
    };
  },
  getFormSettings : function () {
    return {
      id: fields.number({ widget: forms.widgets.hidden() }),
      title: fields.string({ required: true, label: 'Titel', validators: [forms.validators.maxlength(255)] }),
      start: fields.string({ required: true, label: 'Startar', cssClasses: {field: ['time']}, validators: [validateTime()] }),
      stop: fields.string({ required: true, label: 'Slutar', cssClasses: {field: ['time']}, validators: [validateTime()] }),
      category: fields.string({ required: true, label: 'Spår', choices: ['Vänster', 'Höger'], widget: forms.widgets.multipleRadio() }),
      speaker: fields.string({ label: 'Talare' }),
      description: fields.string({ label: 'Beskrivning', widget: forms.widgets.textarea() }),
    };
  },
  getList : function () {
    return this.knex('agenda')
      .select('id', 'title', 'start', 'stop', 'category', 'modified')
      .orderBy('start', 'asc')
      .orderBy('category', 'asc')
      .orderBy('title', 'asc');
  },
  doGet : function (id) {
    return this.knex('agenda').first(
      'id',
      'title',
      this.knex.raw("to_char(start, 'HH24:MI') AS start"),
      this.knex.raw("to_char(stop, 'HH24:MI') AS stop"),
      'description',
      this.knex.raw('category::text'),
      'speaker',
      'data'
    ).where('id', id)
    .then(item => item ? Object.assign(item, item.data || {}) : item);
  },
  doDelete : function (id) {
    return this.knex('agenda').where('id', id).delete();
  },
  doPost : function (form) {
    var data = {
      title: form.data.title,
      start: form.data.start,
      stop: form.data.stop,
      description: form.data.description,
      category: form.data.category,
      speaker: form.data.speaker,
      data: form.data.data || null,
    };

    if (form.data.id) {
      data.modified = this.knex.raw('NOW()');

      return this.knex('agenda').where('id', form.data.id).update(data);
    } else {
      return this.knex('agenda').insert(data);
    }
  },
});
