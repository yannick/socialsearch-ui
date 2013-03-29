'use strict';

var module = angular.module('filters', []);

/**
* Filter to truncate text
* 
* Usage in HTML: 
* {{ text | truncate:length:end }}
*/

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

/**
* Filter items by a given attribute value
* Used to exlude objects by category using checkboxes
* 
* The expected format for attribute searches is 
*   { 
*     <key>: {
*       <value>: <boolean>, 
*       ...,
*       _other: <boolean> 
*     },
*     ... 
*   }
*/

module.filter('attributeToggle', function () {
  return function (items, attributeSearches) {
    var filteredItems = []; 
    _.each(items, function(item) {
      _.each(attributeSearches, function(attributeValues, attribute){
        if (typeof(attributeValues[item[attribute]]) !== undefined && attributeValues[item[attribute]]) {
          filteredItems.push(item);
        } else if (attributeValues._other) {
          filteredItems.push(item);
        }
      });
    });
    //debugger;
    return filteredItems;
  };
});