/*eslint-disable*/

'use strict';

var strftime = require('strftime');

// JavaScript Pretty Date (Modified by @VoxPelli)
// Copyright (c) 2011 John Resig (ejohn.org)
// Licensed under the MIT and GPL licenses.

// Takes an ISO time and returns a string representing how
// long ago the date represents.
function prettyDate(time){
  var date = typeof time === 'object' ? time : new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff)) {
    return;
  }
  if (day_diff < 0 || day_diff >= 31) {
    return strftime('%F %R', date);
  }

  return day_diff === 0 && (
      diff < 60 && "just nu" ||
      diff < 120 && "1 minut sedan" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minuter sedan" ||
      diff < 7200 && "1 timme sedan" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " timmar sedan") ||
    day_diff === 1 && "Igår" ||
    day_diff < 7 && day_diff + " dagar sedan" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " veckor sedan";
}

module.exports = prettyDate;
