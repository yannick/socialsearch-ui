'use strict';

/**
 * FullProof service
 * Provides a FullProof search engine
 *
 * Usage: 
 *  searchEngine = fullproofSearchEngine(data, databaseName, successCallback, errorCallback); 
 *  searchEngine.search(searchTerm, callback);
 *
 *  'data' must be an array of objects
 *  'callback' will receive the matching objects from 'data' as argument
 */

var module = angular.module('services.fullproofSearchEngine', []);

module.factory('fullproofSearchEngine', [  
  function() {

    var fullproofFactory = function(data, databaseName, successCallback, errorCallback, progressCallback) {
      // Setup search engine
      var searchEngine = new fullproof.BooleanEngine();

      // Define an index
      var index = {
        name: "normalindex",
        analyzer: new fullproof.StandardAnalyzer(fullproof.normalizer.to_lowercase_nomark, fullproof.normalizer.remove_duplicate_letters),
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

        _.each(data, function(item, i) {
          // Extract all keys and values as text from the item's JSON
          // removing any special characters 
          var text = angular.toJson(item).split(/[\[\]\{\}\:\"\s\n]|\\n|\\"+/).join(" ");
          keys.push(i); 
          texts.push(text);
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