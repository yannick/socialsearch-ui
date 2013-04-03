'use strict';

/**
* Main controller
*/
app.controller('MainCtrl', function ($scope, $http, facebookApi, localStorageService) {
  // Scope variables
  $scope.facebookApiToken = localStorageService.get('facebookApiToken') || '';
  $scope.objects = angular.fromJson(localStorageService.get('objects')) || [];
  $scope.objectsUpdatedAt = localStorageService.get('objectsUpdatedAt') || null;
  $scope.updateStartedAt = null;
  $scope.errors = [];
  $scope.loading = false;
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

  /*
  * Defines if Facebook data can be loaded
  * Used to enable/disable the 'Load Facebook Data' button 
  */
  $scope.canLoad = function(){
    return ($scope.facebookApiToken.length > 0 && $scope.loading == false );
  }

  /*
  * Loads objects via the Facebook Graph API into $scope.objects
  * 
  * Requires a valid $scope.facebookApiToken
  * Objects to load are defined in config/facebook-objects.js as 'facebookObjects'
  */
  $scope.load = function(){
    // Set inital scope values 
    $scope.progress = 0;
    $scope.errors = [];
    $scope.loading = true;
    $scope.updateStartedAt = new Date().getTime();

    var completedCalls = 0;
    var facebookApiInstance = facebookApi($scope.facebookApiToken);

    localStorageService.add('facebookApiToken', $scope.facebookApiToken);

    _.each(facebookObjects, function(facebookObject) {
      // Send HTTP request
      var requestUrl = 'me/' + facebookObject.url;

      if ($scope.objectsUpdatedAt) 
        requestUrl += '?since=' + Math.floor(parseInt($scope.objectsUpdatedAt)/1000);

      facebookApiInstance.get(requestUrl, 
        // Success callback
        function(data, status, headers, config, queue) {
          _.each(data.data, function(responseObject){
            // Extend response objects with meta properties
            _.extend(responseObject, {_type: facebookObject.url});
            facebookObject.preview = facebookObject.preview || 'name';
            _.extend(responseObject, {_preview: getNestedAttribute(responseObject, facebookObject.preview)});
          
            // Load into scope unless object already in list
            if (_.findWhere($scope.objects, {id: responseObject.id}) === undefined) {
              $scope.objects.push(responseObject);
              localStorageService.add('objects', angular.toJson($scope.objects));
            }
          });

          // Update timer
          $scope.objectsUpdatedAt = new Date().getTime();
          localStorageService.add('objectsUpdatedAt', $scope.objectsUpdatedAt);

          // Update progress 
          completedCalls += 1;
          $scope.progress = (100*completedCalls)/(completedCalls+queue.length);
          $scope.loading = (queue.length > 0); 
        },
        // Error callback
        function(data, status, headers, config, queue) {
          if ( data.error !== undefined )
            $scope.errors.push(data.error.message);
          else
            $scope.errors.push("Unknown error");

          // Update progress 
          completedCalls += 1;
          $scope.progress = (100*completedCalls)/(completedCalls+queue.length);
          $scope.loading = (queue.length > 0);
        });
    });
  };

  /*
  * Resets the local storage and scope objects
  */
  $scope.reset = function() {
    $scope.progress = 0;
    $scope.errors = [];
    $scope.objects = [];
    $scope.objectsUpdatedAt = null;
    $scope.updateStartedAt = null;
    localStorageService.clearAll();
  }

  /*
  * Returns the total crawl duration in seconds
  */
  $scope.getUpdateTime = function() {
    if ($scope.updateStartedAt && $scope.objectsUpdatedAt)
      return ($scope.objectsUpdatedAt-$scope.updateStartedAt) / 1000;
    else
      return null;
  };

  /*
  * Returns a formatted string of the last update time
  */
  $scope.getLastUpdated = function() {
    if ($scope.objectsUpdatedAt)
      return new Date(parseInt(localStorageService.get('objectsUpdatedAt'))).toTimeString();
    else 
      return "never";
  };

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

  $scope.objectsUpdatedAtDisplay = function(){
    if (objectsUpdatedAt === null) return 'never';
  };
});