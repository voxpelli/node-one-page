/* jshint node: true */
/* global -Promise */
/* jscs:disable */

'use strict';

// Partly copied from forms module 0.3.0 and later upgraded to work with forms 1.1.1

var singleTag, imageInput
  , htmlEscape = require('forms/lib/htmlEscape')
  , tag = require('forms/lib/tag')
  , attrs = tag.attrs
  , cloudimage = require('../utils/cloudimage');

singleTag = function tag(tagName, attrsMap) {
    tagName = htmlEscape(tagName);
    var attrsHTML = !Array.isArray(attrsMap) ? attrs(attrsMap) : attrsMap.reduce(function (html, attrsMap) {
        return html + attrs(attrsMap);
    }, '');
    return '<' + tagName + attrsHTML + ' />';
};

imageInput = function () {
    var dataRegExp = /^data-[a-z]+$/,
        ariaRegExp = /^aria-[a-z]+$/,
        legalAttrs = ['accept', 'autocomplete', 'autocorrect', 'autofocus', 'autosuggest', 'checked', 'dirname', 'disabled', 'list', 'max', 'maxlength', 'min', 'multiple', 'novalidate', 'pattern', 'placeholder', 'readonly', 'required', 'size', 'step'],
        ignoreAttrs = ['id', 'name', 'class', 'classes', 'type', 'value'],
        getUserAttrs = function (opt) {
            return Object.keys(opt).reduce(function (attrs, k) {
                if ((ignoreAttrs.indexOf(k) === -1 && legalAttrs.indexOf(k) > -1) || dataRegExp.test(k) || ariaRegExp.test(k)) {
                    attrs[k] = opt[k];
                }
                return attrs;
            }, {});
        };
    return function (opt) {
        if (!opt) { opt = {}; }
        var userAttrs = getUserAttrs(opt);
        var w = {
            classes: opt.classes,
            type: 'file',
            accept: 'image/*',
            formatValue: function (value) {
                return value || null;
            }
        };
        w.toHTML = function (name, f) {
            if (!f) { f = {}; }
            var imageHtml = '';
            if (f.value) {
              imageHtml = singleTag('img', {
                src: cloudimage(f.value, opt.preset || 'thumb'),
                width : 48,
                height : 48
              });
              imageHtml = tag('a', {
                target : '_blank',
                href : cloudimage(f.value, 'none')
              }, imageHtml);
            }
            return singleTag('input', [{
                type: 'file',
                name: name,
                id: f.id || true,
                classes: w.classes
            }, userAttrs, w.attrs || {}]) + imageHtml;
        };
        w.getDataRegExp = function () {
            return dataRegExp;
        };
        w.getAriaRegExp = function () {
            return ariaRegExp;
        };
        return w;
    };
};

exports.widgets = {
  image : imageInput()
};
