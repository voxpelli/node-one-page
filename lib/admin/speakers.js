'use strict';

var ContentType = require('../../').BaseType;
var _ = require('lodash');
var formsUtil = require('../utils/forms');
var forms = require('forms');
var fields = forms.fields;
var cloudinary = require('cloudinary');
var cloudimage = require('../utils/cloudimage');

module.exports = ContentType.extend({
  constructor : function (options) {
    this.formName = 'speakerForm';

    options = _.extend({
      id : 'speakers',
    }, options || {});

    ContentType.call(this, options);

    this.isMultiPage = !!options.multipage;

    this.getPath = true;
    this.deletePath = true;
    this.formTemplate = 'admin-form-speakers';
  },
  supportsMultiPage: function () {
    return this.isMultiPage;
  },
  getDataQuery : function (page) {
    let query = this.knex('speakers')
      .select('id', 'name', 'description', 'image', 'links', 'data')
      .where('published', true)
      .orderBy('name', 'asc');

    if (this.supportsMultiPage()) {
      query = query.where('page', page || 0);
    }

    return query.then(speakers =>
      speakers.map(speaker =>
        Object.assign(speaker, speaker.data, { data: undefined })
      )
    );
  },
  getTemplate : function (data, dictionary) {
    var subChildren = [];

    //TODO: Remake into a speaker element type which resolves these subChildren through an added preRenders function
    _.each(data, function (speaker) {
      subChildren.push({
        template : 'speaker',
        variables : { el : speaker },
      });
    });

    return {
      children : subChildren,
      variables : {
        menuName : dictionary.speakers,
        name : 'speakers',
        header : dictionary.speakersHeader,
      },
    };
  },
  getFileFields : function () {
    return { image : {
      tags: ['speakers'],
      width: 1000,
      height: 1000,
      crop: 'limit',
      eager: [
        cloudimage.preset.front,
        cloudimage.preset.thumb,
      ],
    }};
  },
  getFormSettings : function () {
    return {
      id: fields.number({ widget: forms.widgets.hidden() }),
      name: fields.string({ required: true, label: 'Namn', validators: [forms.validators.maxlength(255)] }),
      description: fields.string({
        label: 'Introduktion',
        widget: forms.widgets.textarea(),
        validators: [forms.validators.maxlength(255)],
      }),
      image: fields.string({ label: 'Bild', widget: formsUtil.widgets.image() }),
      //TODO: test if this works
      deleteimage : fields.boolean({ widget: forms.widgets.hidden() }),
      twitter: fields.string({ widget: forms.widgets.text() }),
      github: fields.string({ label: 'GitHub', widget: forms.widgets.text() }),
      linkedin: fields.string({ label: 'LinkedIn' }),
      dribbble: fields.string({ label: 'Dribbble' }),
      video: fields.string({ label: 'Video' }),
      blog: fields.string({ label: 'Blogg' }),
      published: fields.boolean({ label: 'Publicerad' }).bind(true),
    };
  },
  getList : function (currentPage) {
    return this.knex('speakers')
      .select('id', 'name', 'published', 'modified')
      .where('page', currentPage || 0)
      .orderBy('name', 'asc');
  },
  doGet : function (id) {
    return this.knex('speakers')
      .where('id', id)
      .first('id', 'name', 'description', 'links', 'image', 'published', 'data')
      .then(function (speaker) {
        if (speaker && speaker.links) {
          _.each(speaker.links, function (link, type) {
            if (!speaker[type]) {
              speaker[type] = link;
            }
          });
          delete speaker.links;
        }
        if (speaker) {
          speaker = Object.assign(speaker, speaker.data || {});
        }
        return speaker;
      });
  },
  doDelete : function (id) {
    return this._deleteImage(id).then(function () {
      return this.knex('speakers').where('id', id).delete();
    }.bind(this));
  },
  deleteByPage: function (page) {
    return this.knex('speakers').where('page', page).delete();
  },
  doPost : function (form, req) {
    var data = {
      page: req.multipage ? req.multipage.id : 0,
      name: form.data.name,
      description: form.data.description,
      links: {
        twitter : form.data.twitter,
        github : form.data.github,
        linkedin : form.data.linkedin,
        dribbble : form.data.dribbble,
        video : form.data.video,
        blog : form.data.blog,
      },
      published: form.data.published,
      data: form.data.data || null,
    };

    if (form.data.image) {
      data.image = form.data.image;
    }

    if (form.data.id) {
      var removeOldImage = (form.data.deleteimage || data.image) ? this._deleteImage(form.data.id) : Promise.resolve();

      data.modified = this.knex.raw('NOW()');

      return removeOldImage.then(() =>
        this.knex('speakers')
          .where('id', form.data.id)
          .update(form.data.deleteimage ? { image: null, modified: data.modified } : data)
      );
    } else {
      return this.knex('speakers').insert(data);
    }
  },
  _deleteImage: function (id) {
    return this.knex('speakers')
      .first('image')
      .where('id', id)
      .then(function (result) {
        if (result && result.image && result.image.indexOf('/') === -1) {
          cloudinary.uploader.destroy(result.image, function (result) {
            console.log('Image destruction:', result);
          });
        }
      });
  },
});
