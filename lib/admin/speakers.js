/*jslint node: true, white: true, indent: 2 */

"use strict";

var ContentType = require('./base')
  , Promise = require('promise')
  , _ = require('lodash')
  , formsUtil = require('../utils/forms')
  , forms = require('forms')
  , fields = forms.fields
  , cloudinary = require('cloudinary')
  , cloudimage = require('../utils/cloudimage')
  , deleteImage;

deleteImage = function (id) {
  return this.knex('speakers')
    .first('image')
    .where('id', id)
    .then(function (result) {
      if (result && result.image && result.image.indexOf('/') === -1) {
        cloudinary.uploader.destroy(result.rows[0].image, function (result) {
          console.log('Image destruction:', result);
        });
      }
    });
};

module.exports = ContentType.extend({
  constructor : function (options) {
    this.formName = 'speakerForm';

    options = _.extend({
      id : 'speakers'
    }, options || {});

    ContentType.call(this, options);

    this.getPath = true;
    this.deletePath = true;
  },
  getFileFields : function () {
    return { image : {
      tags: [ 'speakers' ],
      width: 1000,
      height: 1000,
      crop: 'limit',
      eager: [
        cloudimage.preset.front,
        cloudimage.preset.thumb
      ]
    }};
  },
  getFormSettings : function () {
    return {
      id: fields.number({ widget: forms.widgets.hidden() }),
      name: fields.string({ required: true, label: 'Namn' }),
      description: fields.string({ label: 'Introduktion', widget: forms.widgets.textarea() }),
      image: fields.string({ label: 'Bild', widget: formsUtil.widgets.image() }),
      //TODO: test if this works
      deleteimage : fields.boolean({ widget: forms.widgets.hidden() }),
      twitter: fields.string({ widget: forms.widgets.text() }),
      github: fields.string({ label: 'GitHub', widget: forms.widgets.text() }),
      linkedin: fields.string({ label: 'LinkedIn' }),
      dribbble: fields.string({ label: 'Dribbble' }),
      blog: fields.string({ label: 'Blogg' })
    };
  },
  getList : function () {
    return this.knex('speakers').select('id', 'name', 'modified').orderBy('name', 'asc');
  },
  doGet : function (id) {
    return this.knex('speakers')
      .where('id', id)
      .first('id', 'name', 'description', 'links', 'image')
      .then(function (speaker) {
        if (speaker && speaker.links) {
          _.each(speaker.links, function (link, type) {
            if (!speaker[type]) {
              speaker[type] = link;
            }
          });
          delete speaker.links;
        }
        return speaker;
      });
  },
  doDelete : function (id) {
    return deleteImage(id).then(function () {
      return this.knex('speakers').where('id', id).delete();
    }.bind(this));
  },
  doPost : function (callback, form) {
    var data = {
      name: form.data.name,
      description: form.data.description,
      links: {
        twitter : form.data.twitter,
        github : form.data.github,
        linkedin : form.data.linkedin,
        dribbble : form.data.dribbble,
        blog : form.data.blog
      },
    };

    if (form.data.image) {
      data.image = form.data.image;
    }

    if (form.data.id) {
      var removeOldImage = (form.data.deleteimage || data.image) ? deleteImage(form.data.id) : Promise.resolve();

      data.modified = this.knex.raw('NOW()');

      removeOldImage.then(function () {
        return this.knex('speakers')
          .where('id', form.data.id)
          .update(form.data.deleteimage ? { image: null, modified: data.modified } : data);
      }.bind(this)).nodeify(callback);
    } else {
      this.knex('speakers').insert(data).nodeify(callback);
    }
  }
});
