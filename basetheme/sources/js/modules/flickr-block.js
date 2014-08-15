/*jslint browser: true */
/* global SirTrevor, _, base58 */
SirTrevor.Blocks.Flickr = (function(){
  "use strict";

  return SirTrevor.Block.extend({

    flickrRegex: /(?:http[s]?:\/\/)?(?:www.)?(?:(?:(flickr.com)\/photos\/[^\/]+\/)|(?:(flic.kr)\/p\/))(\w+)/,
    flickrKey: null,

    type: 'flickr',
    droppable: true,
    pastable: true,
    fetchable: true,

    icon_name: 'image',

    fetchUrl: function(photoID) {
      return 'https://api.flickr.com/services/rest/?method=flickr.photos.getSizes' +
        '&api_key=' + this.flickrKey + '&photo_id=' + photoID + '&format=json';
    },

    loadData: function(data){
      if (data.flickr && data.flickr.length) {
        this.$editor.html($('<img>', { src: data.flickr[8].src }));
      }
    },

    onContentPasted: function(event){
      this.handleDropPaste($(event.target).val());
    },

    handleDropPaste: function(url){
      if(!_.isURI(url)) {
        return false;
      }

      var match = this.flickrRegex.exec(url), photoID;

      if (match === null || _.isUndefined(match[3])) {
        this.addMessage("Invalid Flickr URL");
        return false;
      }

      photoID = match[3];

      if (match[2]) {
        photoID = base58.decode(photoID);
      }

      var ajaxOptions = {
        url: this.fetchUrl(photoID),
        jsonp: 'jsoncallback',
        dataType: 'jsonp'
      };

      this.fetch(ajaxOptions, this.onFetchSuccess, this.onFetchFail);
    },

    onFetchSuccess: function(data) {
      var sizes = [];

      if (data.sizes && data.sizes.size) {
        _.each(data.sizes.size, function (size) {
          sizes.push({
            width: size.width,
            height: size.height,
            src: size.source,
            href: size.url
          });
        });
      }

      sizes = _.sortBy(sizes, function (size) {
        return parseInt(size.width, 10);
      });

      this.setAndLoadData({
        flickr: sizes
      });
      this.ready();
    },

    onFetchFail: function() {
      this.addMessage("Failed to fetch data from Flickr");
      this.ready();
    },

    onDrop: function(transferData){
      var url = transferData.getData('text/plain');
      this.handleDropPaste(url);
    }
  });

}());
