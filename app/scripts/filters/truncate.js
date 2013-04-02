'use strict';

/**
* Filter to truncate text
* 
* Usage in HTML: 
*   {{ text | truncate:length:end }}
*/

var module = angular.module('filters.truncate', []);

module.filter('truncate', function () {
  return function (text, length, end) {
    if (text==null)
      return null;

    if (isNaN(length))
      length = 250;

    if (end === undefined)
      end = "...";

    if (text.length <= length || text.length - end.length <= length) {
      return text;
    } else {
      return String(text).substring(0, length-end.length) + end;
    }

  };
});