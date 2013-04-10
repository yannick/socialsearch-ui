'use strict';

/**
* Service for retrieving objects via the Facebook Graph API asynchronously
* - Implements a rate limit for API requests
* - Implements transparent paging to load all objects
* - Automatically uses batch calls to minimize the number of requests
*
* Usage in controllers:
*   var myApi = facebookApi(FACEBOOK_API_ACCESS_TOKEN);
*   myApi.get(objectPath, successCallback, errorCallback);
*
* For a documentation of all method please see "Public methods" section below.
*
*/

var module = angular.module('services.facebookApi', []);

module.factory('facebookApi',
  function($rootScope, $http, FACEBOOK_API_RATE_LIMIT, FACEBOOK_API_BATCH_SIZE) {

    var facebookApiFactory = function(apiAccessToken) {
      var self = this;

      // Facebook API config
      var apiBaseUrl = 'https://graph.facebook.com/';
      var batchSize = FACEBOOK_API_BATCH_SIZE; // Size limit for batch calls
      var apiRateLimit = FACEBOOK_API_RATE_LIMIT; // Rate limit for API requests in miliseconds

      // Set headers for the API 
      $http.defaults.headers.common['X-Requested-With'] = null;
      $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

      // Queue of items and callbacks for batch call
      var batchItemQueue = [];
      var batchItemCallbacks = [];
      var remainingCalls = 0;

      /* 
       * Works the queue to send $http requests for each item in the queue,
       * transparently handling the rate limit
       */
      function processQueue() {
        // Get next batch
        var batch = batchItemQueue.slice(0, batchSize); 
        batchItemQueue = batchItemQueue.slice(batchSize);

        var batchCallbacks = angular.copy(batchItemCallbacks);
        batchItemCallbacks = batchItemCallbacks.slice(batchSize);

        // Load all items in queue into one batch call: 
        $http.post(apiBaseUrl, 'access_token=' + apiAccessToken + '&batch=' + angular.toJson(batch))
          .success(function(data, status, headers, config) {
            _.each(data, function(dataItem, index) {
              remainingCalls -= 1;

              if ( dataItem === null ) {
                // Error if no response for batch item 
                batchCallbacks[index].errorCallback(
                  {error: {message: "Batch call only partially processed."}}, {}, {}, {}, 
                  batchItemQueue
                );
              } else {
                // Convert response to JSON
                dataItem.body = angular.fromJson(dataItem.body);

                // Send additional requests for next page (pagination)
                // See https://developers.facebook.com/docs/reference/api/pagination/
                if ( dataItem.body.paging !== undefined && dataItem.body.paging.next !== undefined ) {
                  var relativeUrl = dataItem.body.paging.next.replace(apiBaseUrl, '');
                  relativeUrl = dataItem.body.paging.next.replace('http://graph.facebook.com/', '');
                  
                  // Add call with callbacks from original request
                  remainingCalls += 1;
                  batchItemQueue.push({method: 'GET', relative_url: encodeURIComponent(relativeUrl)});
                  batchItemCallbacks.push({
                    successCallback: batchCallbacks[index].successCallback, 
                    errorCallback: batchCallbacks[index].errorCallback
                  });
                  startQueue();
                };

                // Callbacks
                if (dataItem.body.error !== undefined)
                  batchCallbacks[index].errorCallback(dataItem.body, status, headers, config);
                else
                  batchCallbacks[index].successCallback(dataItem.body, status, headers, config);
              }             
            });
          })
          .error(function(data, status, headers, config){
            remainingCalls -= batch.length;
            batchCallbacks[0].errorCallback(data, status, headers, config);
          });

        // Continue to process the queue if batch items remaining
        window.clearTimeout(queueTimeout); window.queueTimeout = undefined;
        if (batchItemQueue.length > 0) startQueue();
      }

      /*
       * Starts processing the queue if not already started
       */
      function startQueue() {
        if (window.queueTimeout === undefined) 
          window.queueTimeout = window.setTimeout(processQueue, apiRateLimit);
      }

      /*
       * Stops processing the queue
       */
      function stopQueue() {
        window.clearTimeout(queueTimeout); window.queueTimeout = undefined;
      }

      /*
       * Helper function to get an object's attribute from its string notation
       */
      function getNestedAttribute(object, attributeString) {
        var resultAttribute = object;
        var attributeHierarchy = attributeString.split(".");
        _.each(attributeHierarchy, function(attribute){
          if (Array.isArray(resultAttribute)) {
            resultAttribute = resultAttribute[0];
          }
          if (resultAttribute != null && typeof(resultAttribute[attribute]) !== 'undefined') {
            resultAttribute = resultAttribute[attribute];
          } else {
            resultAttribute = null;
          }
        });
        return resultAttribute;
      }


      /* Public methods */


      var facebookApi = {

        /*
         * Query an API endpoint
         *
         * Calls 'successCallback' or 'errorCallback' when a response has been received
         *
         * Parameters:
         *   path     relative path of the API endpoint
         */
        get: function(path, successCallback, errorCallback) {
          // Add batch item to queue
          remainingCalls += 1;
          batchItemQueue.push({method: 'GET', relative_url: path});
          batchItemCallbacks.push({successCallback: successCallback, errorCallback: errorCallback});
          startQueue();
        },
        /*
         * Loads all of a users' connections
         *
         * Requires a valid $scope.facebookApiToken
         * Objects to load are defined in config.js FACEBOOK_OBJECTS
         *
         * Parameters:
         *   facebookObjectID     The user's or object's Facebook ID
         *   facebookObjectID     The user's or object's name or title
         *   connections          Array of Facebook connections to load
         *   since                (optional) Timestamp for the 'since' API parameter
         *   callSuccessCallback  Callback for each connection, when successful
         *   progressCallback     Progress callback, called with a progress parameter 0..1
         *   completedCallback    Callback when all API calls completed
         */
        loadConnections: function(facebookObjectId, facebookObjectName, connections, since, callSuccessCallback,
          progressCallback, completedCallback) {
          var completedCalls = 0;

          _.each(connections, function(facebookObject) {
            // Send HTTP request
            var requestUrl = facebookObjectId + "/" + facebookObject.url;

            if (since) requestUrl += '?since=' + since;

            facebookApi.get(requestUrl,
              // Success callback
              function(data, status, headers, config) {
                var responseObjects = [];

                // Extend response objects with meta properties
                _.each(data.data, function(responseObject){
                  _.extend(responseObject, {_for: facebookObjectId});
                  _.extend(responseObject, {_for_name: facebookObjectName});
                  _.extend(responseObject, {_type: facebookObject.url});
                  facebookObject.preview = facebookObject.preview || 'name';
                  _.extend(responseObject, {_preview: getNestedAttribute(responseObject,
                    facebookObject.preview)});
                  responseObjects.push(responseObject);
                });

                // Call success callback
                callSuccessCallback(responseObjects, facebookObjectId);

                // Progress callback
                completedCalls += 1;
                var progress = completedCalls/(completedCalls+facebookApi.remainingCalls());
                progressCallback(progress);

                // Completed callback
                if (progress == 1) completedCallback(facebookObjectId);
              },
              // Error callback
              function(data, status, headers, config) {
                // Error notification
                if ( data.error !== undefined )
                  $rootScope.$broadcast('facebookAPI.notification.warning', data.error.message);
                else
                  $rootScope.$broadcast('facebookAPI.notification.warning', 'No network connectivity or unknown error');

                // Progress callback
                completedCalls += 1;
                var progress = completedCalls/(completedCalls+facebookApi.remainingCalls());
                progressCallback(progress);

                // Completed callback
                if (progress == 1) completedCallback(facebookObjectId);
              });
          });
        },

        /* 
         * Stops all queued API calls
         */
        stop: function() {
          stopQueue();
        },

        /* 
         * Get the current number of remaining calls
         */
        remainingCalls: function() {
          return remainingCalls;
        }
      }

      return facebookApi;
    };

    return facebookApiFactory;
  }
);