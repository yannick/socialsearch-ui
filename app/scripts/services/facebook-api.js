'use strict';

/**
* Service for retrieving objects via the Facebook Graph API asynchronously
* - Implements a rate limit for API requests
* - Implements transparent paging to load all objects
* - Automatically uses batch calls to minimize requests 
* 
* Usage in controllers: 
*   var myApi = facebookApi(FACEBOOK_API_ACCESS_TOKEN);
*   myApi.get(objectPath, successCallback, errorCallback);  
*/

var module = angular.module('services.facebookApi', []);

module.factory('facebookApi', [ 
  '$http',  
  function($http) {

    var facebookApiFactory = function(apiAccessToken) {
      // Facebook API config
      var apiBaseUrl = 'https://graph.facebook.com/';
      var batchSize = 5; // Size limit for batch calls
      var apiRateLimit = 1000; // Rate limit for API requests in miliseconds

      // Set headers for the API 
      $http.defaults.headers.common['X-Requested-With'] = null;
      $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';

      // Queue of items and callbacks for batch call
      var batchItemQueue = [];
      var batchItemCallbacks = [];

      // Works the queue to send $http requests for each item in the queue,
      // transparently handling the rate limit 
      function processQueue() {
        // Get next batch
        var batch = batchItemQueue.slice(0, batchSize); 
        batchItemQueue = batchItemQueue.slice(batchSize);

        var batchCallbacks = angular.copy(batchItemCallbacks);
        batchItemCallbacks = batchItemCallbacks.slice(batchSize);

        // Load all items in queue into one batch call: 
        $http.post(apiBaseUrl, 'access_token=' + apiAccessToken + '&batch=' + angular.toJson(batch))
          .success(function(data, status, headers, config){
            _.each(data, function(dataItem, index){
              // Error if no response for batch item 
              if ( dataItem === null ) {
                batchCallbacks[index].errorCallback(
                  {error: {message: "Batch call only partially processed."}}, {}, {}, {}, 
                  batchItemQueue
                );
                return;
              }

              // Convert response to JSON
              dataItem.body = angular.fromJson(dataItem.body);

              // Send additional requests for next page (pagination)
              // See https://developers.facebook.com/docs/reference/api/pagination/
              if ( dataItem.body.paging !== undefined && dataItem.body.paging.next !== undefined ) {
                var relativeUrl = dataItem.body.paging.next.replace(apiBaseUrl, '');
                relativeUrl = dataItem.body.paging.next.replace('http://graph.facebook.com/', '');
                
                // Add call with callbacks from original request
                batchItemQueue.push({method: 'GET', relative_url: encodeURIComponent(relativeUrl)});
                batchItemCallbacks.push({
                  successCallback: batchCallbacks[index].successCallback, 
                  errorCallback: batchCallbacks[index].errorCallback
                });
                startQueue();
              };

              // Callbacks
              if (dataItem.body.error !== undefined)
                batchCallbacks[index].errorCallback(dataItem.body, status, headers, config, batchItemQueue);
              else if (dataItem.body.data.length >= 0)
                batchCallbacks[index].successCallback(dataItem.body, status, headers, config, batchItemQueue);
            });
          })
          .error(function(data, status, headers, config){
            batchCallbacks[0].errorCallback(data, status, headers, config, batchItemQueue);
          });

        // Continue to process the queue if batch items remaining
        window.clearTimeout(queueTimeout); window.queueTimeout = undefined;
        if (batchItemQueue.length > 0) startQueue();
      }

      function startQueue() {
        if (window.queueTimeout === undefined) 
          window.queueTimeout = window.setTimeout(processQueue, apiRateLimit);
      }

      // API methods
      var facebookApi = {
        get: function(path, successCallback, errorCallback) {
          // Add batch item to queue
          batchItemQueue.push({method: 'GET', relative_url: path});
          batchItemCallbacks.push({successCallback: successCallback, errorCallback: errorCallback});
          startQueue();
        }
      }

      return facebookApi;
    };

    return facebookApiFactory;
  }
]);