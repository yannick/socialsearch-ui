'use strict';

/**
 * FullProof service
 * Provides a FullProof search engine
 *
 * Usage: 
 *  searchEngine = fullproofSearchEngine(data, indexableKeys, databaseName, 
 *    successCallback, errorCallback); 
 *  searchEngine.search(searchTerm, callback);
 *
 *  'data' must be an array of objects
 *  'indexableKeys' must be an array of all keys of 'data' of which the values shall be 
 *    indexed (keys may be nested)
 *  'errorCallback' or 'successCallback' will receive the matching objects from 'data'
 *    as single argument
 */

var module = angular.module('services.fullproofSearchEngine', []);

module.factory('fullproofSearchEngine', [  
  function() {

    var fullproofFactory = function(data, indexableKeys, databaseName, successCallback, errorCallback, progressCallback) {
      // Setup search engine
      var searchEngine = new fullproof.BooleanEngine();

      // Define an index
      var index = {
        name: "normalindex",
        analyzer: new fullproof.StandardAnalyzer(fullproof.normalizer.to_lowercase_nomark),
        capabilities: new fullproof.Capabilities().setUseScores(false).setDbName(databaseName),
        initializer: initializer
      };

      // Define initializer
      // Called when the index is created, injects searchable text for each item 
      function initializer(injector, callback) {
        //debugger;
        var synchro = fullproof.make_synchro_point(callback, data.length-1);
        var texts = [];
        var keys = [];

        // Helper function, recursively loads an object's string values of predefined keys
        // Valid keys are predefined as 'indexableKeys'
        function loadIndexableTexts(object, indexableKeys, objectTexts) {
          objectTexts = objectTexts || [];
          if (object === null) return objectTexts;

          _.each(_.keys(object), function(key) {
            if (typeof(object[key]) == "object") {
              loadIndexableTexts(object[key], indexableKeys, objectTexts);
            } else if (_.contains(indexableKeys, key) && typeof(object[key]) == "string") {
              objectTexts.push(object[key]);
            }
          });

          return objectTexts;
        }

        _.each(data, function(item, i) {
          // Extract all keys and values as text from the item's JSON
          // removing any special characters 
          var objectTexts = loadIndexableTexts(item, indexableKeys);
          keys.push(i); 
          texts.push(objectTexts.join(" "));
        });

        injector.injectBulk(texts, keys, callback, progressCallback);
      }

      return {
        // Starts the search engine and load or build the index
        start: function() {
          searchEngine.open([index], fullproof.make_callback(successCallback, true), fullproof.make_callback(errorCallback, false));
        },
        // Stops the search engine and clear the index
        clear: function(callback) {
          callback = callback || function(){};
          searchEngine.clear(callback);
        },
        // Re-indexes the data
        reindex: function() {
          searchEngine.clear(function() {
            searchEngine.open([index], fullproof.make_callback(successCallback, true), fullproof.make_callback(errorCallback, false));
          });
        },
        // Searches for a 'search' term and return resulting data
        search: function(search, callback) {
          searchEngine.lookup(search, function(resultset) {
            var resultItems = [];
            if (resultset && resultset.getSize()) {
              resultset.forEach(function(resultIndex) {
                // Add item unless already in result list
                if (data[resultIndex] !== undefined && _.findWhere(resultItems, {id: data[resultIndex].id}) === undefined)
                  resultItems.push(data[resultIndex]);
              });
            }
            callback(resultItems);
          });
        }
      };
    }

    return fullproofFactory;
  }
]);