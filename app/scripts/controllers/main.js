'use strict';

var module = angular.module('fbDataSearchApp');

module.controller('MainCtrl', function ($scope, $http) {
  // Scope variables
  $scope.facebookApiToken = '';
  $scope.objects = [];
  $scope.objectsUpdatedAt = null;
  $scope.errors = [];
  $scope.progress = 0;
  $scope.search = {
    text: '',
    attributes: {
      _type: { 
        likes: true,
        posts: true,
        _other: true
      }
    }
  };

  // Facebook API config
  var apiBaseUrl = 'https://graph.facebook.com/me/';
  var apiRateLimit = 1000; // Rate limit for API requests in miliseconds

  /*
  * Defines if Facebook data can be loaded
  * Used to enable/disable the 'Load Facebook Data' button 
  */
  $scope.canLoadFacebookData = function(){
    return ($scope.facebookApiToken.length > 0 && $scope.progress === 0);
  }

  /*
  * Loads objects via the Facebook Graph API into $scope.objects
  * 
  * Requires a valid $scope.facebookApiToken
  * Objects to load are defined in config/facebook-objects.js as 'facebookObjects'
  */
  $scope.loadFacebookObjects = function(){
    // Clear any errors
    $scope.objects = [];
    $scope.errors = [];

    // Remove headers not allowed by the API and sent by $http by default 
    $http.defaults.headers.common['X-Requested-With'] = null;

    // Load objects from Facebook API
    var index = 0;
    function sendNextRequest() {
      // Set FB object to fetch
      var facebookObject = facebookObjects[index];

      // Send HTTP request
      $http.get(apiBaseUrl + facebookObject.url + "?access_token=" + $scope.facebookApiToken)
        .success(function(data, status, headers, config) {
          // Load object data 
          // - Include API response data from
          var resultObjects = data.data;
          // - Extend with meta information
          _.each(resultObjects, function(responseObject){
            _.extend(responseObject, {_type: facebookObject.url});
            facebookObject.preview = facebookObject.preview || 'name';
            _.extend(responseObject, {_preview: getNestedAttribute(responseObject, facebookObject.preview)});
          });
          // - Load into scope
          $scope.objects = $scope.objects.concat(resultObjects);
          
          // Update progress bar (progress in percent)
          $scope.progress = (100*index)/(facebookObjects.length-1);
          if ($scope.progress===100) $scope.progress = 0;
        })
        .error(function(data, status, headers, config) {
          $scope.errors.push(data.error.message);
          // Update progress bar (progress in percent)
          $scope.progress = (100*index)/(facebookObjects.length-1);
          if ($scope.progress===100) $scope.progress = 0;
        });
      
      // Stop request interval if done
      if (index >= facebookObjects.length-1) {
        window.clearInterval(requestInterval);
      } else {
        index++;
      }
    }

    // Schedule requests to avoid API request rate limiting
    sendNextRequest();
    var requestInterval = window.setInterval(sendNextRequest, apiRateLimit);
    $scope.objectsUpdatedAt = new Date();

    // Helper function to get an object's attribute from its string notation
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
  }

  $scope.objectsUpdatedAtDisplay = function(){
    if (objectsUpdatedAt === null) return 'never';
  };
});