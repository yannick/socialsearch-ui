/**
* Filter items by a given attribute value
* Used to exlude objects by category using checkboxes
* 
* Example usage in HTML:
*   ng-repeat="object in objects | attributeFilter: attributes" 
*
* The expected format for 'attributes' is:  
*   { 
*     <key>: {
*       <value>: <boolean>, 
*       ...,
*       _other: <boolean> 
*     },
*     ... 
*   }
*/

var module = angular.module('filters.attributeFilter', []);

module.filter('attributeFilter', function () {
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

    return filteredItems;
  };
});