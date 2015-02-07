/* jshint node: true */
/* global -Promise */

'use strict';

// Partly copied from forms module 0.3.0
var htmlEscape, attrs, tag, singleTag, imageInput
  , cloudimage = require('../utils/cloudimage');

htmlEscape = (function () {
    var rAmp = /&/g,
        rLt = /</g,
        rGt = />/g,
        rApos = /\'/g,
        rQuot = /\"/g,
        hChars = /[&<>\"\']/;

    var coerceToString = function (val) {
        return String(val || '');
    };

    var htmlEscape = function (str) {
        str = coerceToString(str);
        return hChars.test(str) ?
            str.replace(rAmp, '&amp;')
                .replace(rLt, '&lt;')
                .replace(rGt, '&gt;')
                .replace(rApos, '&#39;')
                .replace(rQuot, '&quot;') :
            str;
    };

    return htmlEscape;
}());

attrs = function (a) {
    if (typeof a.id === 'boolean') {
        a.id = a.id ? 'id_' + a.name : null;
    }
    if (Array.isArray(a.classes) && a.classes.length > 0) {
        a['class'] = a.classes.join(' ');
    }
    a.classes = null;
    var pairs = [];
    Object.keys(a).map(function (field) {
        var value = a[field];
        if (typeof value === 'boolean') {
            value = value ? field : null;
        } else if (typeof value === 'string' && value.length === 0) {
            value = null;
        } else if (typeof value === 'number' && isNaN(value)) {
            value = null;
        }
        if (typeof value !== 'undefined' && value !== null) {
            pairs.push(htmlEscape(field) + '="' + htmlEscape(value) + '"');
        }
    });
    return pairs.length > 0 ? ' ' + pairs.join(' ') : '';
};

tag = function tag(tagName, attrsMap, content) {
    tagName = htmlEscape(tagName);
    var attrsHTML = !Array.isArray(attrsMap) ? attrs(attrsMap) : attrsMap.reduce(function (html, attrsMap) {
        return html + attrs(attrsMap);
    }, '');
    return '<' + tagName + attrsHTML + '>' + content + '</' + tagName + '>';
};

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
