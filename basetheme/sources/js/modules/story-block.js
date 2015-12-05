'use strict';

var $ = require('jquery');
var _ = require('underscore');
var SirTrevor = require('../vendor/sir-trevor');
var FlickrBlock = require('./flickr-block');

module.exports = (function () {
  var template = _.template([
    '<div class="st-required st-text-block" data-st-name="Main description" contenteditable="true"></div>',
    '<div class="st-input-field-wrapper"><label class="st-input-label">Quote</label>',
    '<input maxlength="140" name="quote" class="st-input-string js-quote-input" type="text" /></div>',
    '<div class="st-input-field-wrapper"><label class="st-input-label">Speaker</label>',
    '<input maxlength="140" name="speaker" class="st-input-string js-speaker-input" type="text" /></div>',
    '<div class="st-input-field-wrapper"><label class="st-input-label">Video</label>',
    '<input maxlength="140" name="video" class="st-input-string js-video-input" type="text" placeholder="http://example.com/video" /></div>',
    '<div class="st-input-field-wrapper"><label class="st-input-label">Flickr</label>',
    '<input maxlength="140" name="flickrUrl" class="st-input-string js-flickr-input" type="text" placeholder="https://www.flickr.com/photos/bohman/14162064034/" /><div class="st-image-thumbnail"></div></div>'
  ].join('\n'));

  return FlickrBlock.extend({
    type: 'story',
    icon_name: 'quote',

    droppable: false,
    pastable: false,
    fetchable: true,

    onContentPasted: SirTrevor.Block.prototype.onContentPasted,

    loadData: function (data) {
      this.getTextBlock().html(SirTrevor.toHTML(data.text || '', this.type));
      this.$('.js-quote-input').val(data.quote);
      this.$('.js-speaker-input').val(data.speaker);
      this.$('.js-video-input').val(data.video);
      this.$('.js-flickr-input').val(data.flickrUrl);
      if (data.flickr && data.flickr.length) {
        this.$('.st-image-thumbnail').html($('<a />', { href: data.flickr[8].src, target: '_blank' }).append(
          $('<img>', { src: data.flickr[0].src })
        ));
      } else {
        this.$('.st-image-thumbnail').empty();
      }
    },

    onBlockRender: function () {
      var handleUpdate = _.bind(function (ev) {
        if (this.flickrChangeTimeout) {
          clearTimeout(this.flickrChangeTimeout);
        }
        this.flickrChangeTimeout = setTimeout(_.bind(function () {
          var data, result;

          this.flickrChangeTimeout = null;
          this.save();
          result = this.handleDropPaste($(ev.currentTarget).val());
          if (result === false) {
            data = this.getData();
            data.flickr = undefined;
            this.setAndLoadData(data);
          }
        }, this), 500);
      }, this);

      this.$('.js-flickr-input')
        .on('paste', handleUpdate)
        .on('keyup', handleUpdate)
        .on('change', handleUpdate);
    },

    editorHTML: function () {
      return template(this);
    }
  });
}());
