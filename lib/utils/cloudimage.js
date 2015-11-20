'use strict';

var cloudinary = require('cloudinary');

module.exports = function (image, options) {
  if (!image || image.indexOf('/') !== -1) {
    return image;
  } else {
    options = options || 'front';
    if (typeof options === 'string') {
      options = module.exports.preset[options];
    }
    return cloudinary.utils.url(image, Object.create(options));
  }
};

module.exports.preset = {
  none : { },
  front : { width: 608, height: 608, crop: 'fill', format: 'jpg', gravity: 'face' },
  thumb : { width: 48, height: 48, crop: 'thumb', format: 'jpg', gravity: 'face' },
  nonretina : { width: 0.5, format: 'png' },
};
