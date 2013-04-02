'use strict';

/**
* Service for retrieving objects via the Facebook Graph API asynchronously
* - Implements a rate limit for API requests
* - Implements transparent paging to load all objects
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
      var apiRateLimit = 1100; // Rate limit for API requests in miliseconds

      // Remove headers not allowed by the API and sent by $http by default 
      $http.defaults.headers.common['X-Requested-With'] = null;

      // Queue API requests for rate limiting
      var requestQueue = [];

      // Works the queue to send $http requests for each item in the queue,
      // transparently handling the rate limit 
      function workQueue() {
        var request = requestQueue.shift();

        // Send API request
        // - Construct URL
        if ( request.url == undefined ) request.url = apiBaseUrl + request.path + "?access_token=" + apiAccessToken;
        // - Send GET requests
        $http.get(request.url)
          .success(function(data, status, headers, config){
            // Send additional requests for next page
            // See https://developers.facebook.com/docs/reference/api/pagination/
            if ( data.paging !== undefined && data.paging.next !== undefined ) {
              requestQueue.push({url: data.paging.next, successCallback: request.successCallback, errorCallback: request.errorCallback});
            };

            return request.successCallback(data, status, headers, config, requestQueue.length-1);
          })
          .error(function(data, status, headers, config){
            return request.errorCallback(data, status, headers, config, requestQueue.length-1);
          });
        
        // Continue to work the queue
        if (requestQueue.length > 0) {
          window.setTimeout(workQueue, apiRateLimit);
        } 
      }

      // API methods
      var facebookApi = {
        get: function(path, successCallback, errorCallback) {
          requestQueue.push({path: path, successCallback: successCallback, errorCallback: errorCallback});
          if (requestQueue.length == 1) window.setTimeout(workQueue, apiRateLimit);
        }
      }

      return facebookApi;
    };

    return facebookApiFactory;
  }
]);