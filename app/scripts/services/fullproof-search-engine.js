'use strict';

/*
 * FullProof service
 * Provides a FullProof search engine
 *
 * Usage:
 *  searchEngine = fullproofSearchEngine(databaseName, successCallback, errorCallback);
 *  searchEngine.engine.injectDocument(text, key, callback);
 *  searchEngine.search(searchTerm, callback);
 *
 *  'data' must be an array of objects
 *  'errorCallback' or 'successCallback' will receive the matching objects from 'data'
 *    as single argument
 */

angular.module('services.fullproofSearchEngine', [])

  .factory('fullproofSearchEngine', [
    function () {

      var fullproofFactory = function (databaseName, successCallback, errorCallback) {
        // Setup search engine
        var searchEngine = new fullproof.BooleanEngine();

        // Empty initializer
        function initializer(injector, callback) {
          callback();
        }

        // Define an index
        var index = {
          name: 'normalindex',
          analyzer: new fullproof.StandardAnalyzer(fullproof.normalizer.to_lowercase_nomark),
          capabilities: new fullproof.Capabilities().setUseScores(false).setDbName(databaseName),
          initializer: initializer
        };

        searchEngine.open([index], fullproof.make_callback(successCallback, true), fullproof.make_callback(errorCallback, false));

        return {
          /*
           * Returns the opened fullproof engine
           */
          engine: searchEngine,
          /*
           * Adds a document to the index
           * Must call 'complete' after all documents have been added
           */
          index: function (text, key, callback) {
            callback = callback || function () {};
            searchEngine.injectDocument(text, key, callback);
          },
          /*
           * Completes adding documents to the index
           */
          complete: function (successCallback, errorCallback) {
            successCallback = successCallback || function () {};
            errorCallback = errorCallback || function () {};

            searchEngine.open([index], fullproof.make_callback(successCallback, true),
              fullproof.make_callback(errorCallback, false));
          },
          /*
           * Searches for a 'search' term and returns result keys
           */
          search: function (search, callback) {
            callback = callback || function () {};

            searchEngine.lookup(search, function (resultset) {
              var resultItems = [];
              if (resultset && resultset.getSize()) {
                resultset.forEach(function (resultIndex) {
                  // Add item unless already in result list
                  if (typeof(resultItems[resultIndex]) === 'undefined') {
                    resultItems.push(resultIndex);
                  }
                });
              }
              callback(resultItems);
            });
          },
          /*
           * Resets the search engine and clears all indexes
           */
          reset: function (callback) {
            callback = callback || function () {};
            searchEngine.clear(callback);
          }
        };
      };

      return fullproofFactory;
    }
  ]);