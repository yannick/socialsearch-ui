'use strict';

/*
* Filter items by the value of a given attribute
*
* Example usage in HTML:
*   ng-repeat="object in objects | facetFilter:attributeName:facets"
*
* The expected format for 'facets' is:
*   {
*     <value>: <boolean>, // inlcudes object if attribute has value 'value'
*     ...
*   }
*/

angular.module('filters.facetFilter', [])

  .filter('facetFilter', function () {
    return function (items, attributeName, facets) {
      var filteredItems = [];
      _.each(items, function (item) {
        if (typeof(facets[item[attributeName]]) !== undefined && facets[item[attributeName]]) {
          filteredItems.push(item);
        }
      });

      return filteredItems;
    };
  });