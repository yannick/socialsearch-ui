'use strict';

/**
* Main controller
*/

app.controller('MainCtrl', function ($scope, $http, facebookApi) {
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

    var completedCount = 0;
    var facebookApiInstance = facebookApi($scope.facebookApiToken);

    _.each(facebookObjects, function(facebookObject) {
      // Send HTTP request
      facebookApiInstance.get('me/' + facebookObject.url, 
        // Success callback
        function(data, status, headers, config) {
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
          completedCount += 1;
          $scope.progress = (100*completedCount)/(facebookObjects.length-1);
          if ($scope.progress >= 100) $scope.progress = 0;

          $scope.objectsUpdatedAt = new Date();
        },
        // Error callback
        function(data, status, headers, config) {
          $scope.errors.push(data.error.message);

          // Update progress bar (progress in percent)
          completedCount += 1;
          $scope.progress = (100*completedCount)/(facebookObjects.length-1);
          if ($scope.progress >= 100) $scope.progress = 0;
        });
    });

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