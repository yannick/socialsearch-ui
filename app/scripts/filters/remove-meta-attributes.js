'use strict';

/*
* Filter to remove meta attributes from an object
* Removes all attributes prefixed with '_'
*
* Usage in HTML:
*   {{ object | removeMetaAttributes }}
*/

app.filter('removeMetaAttributes', function () {
  return function (object) {
    var strippedObject = {};
    _.each(_.keys(object), function (key) {
      if (key.indexOf('_') !== 0) {
        strippedObject[key] = object[key];
      }
    });
    return strippedObject;
  };
});