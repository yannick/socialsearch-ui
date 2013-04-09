'use strict';

/**
* Main controller
*/
app.controller('MainCtrl', function ($scope, $http, facebookApi, localStorageService, fullproofSearchEngine, FACEBOOK_OBJECTS, FACEBOOK_OBJECT_INDEXABLE_KEYS) {
  // Token
  $scope.facebookApiToken = localStorageService.get('facebookApiToken') || '';

  // Notifications
  $scope.warnings = [];
  $scope.errors = [];

  // Handle broadcasted notifications
  $scope.$on('LocalStorageModule.notification.error', function(event, message) {
   if (!_.contains($scope.errors, message)) $scope.errors.push(message);
  });
  $scope.$on('app.notification.warning', function(event, message) {
    if (!_.contains($scope.warnings, message)) $scope.warnings.push(message);
  });
  $scope.$on('app.notification.error', function(event, message) {
    if (!_.contains($scope.errors, message)) $scope.errors.push(message);
  });
  
  // Objects and search results
  // Objects are saved in local storage separately with their 'id' as key
  // All retrieved Facebook objects are stored in $scope.objects
  // and those matching the current search in $scope.searchedObjects
  $scope.objectIds = angular.fromJson(localStorageService.get('objectIds')) || [];
  $scope.objects = [];
  _.each($scope.objectIds, function(objectId) {
    var storageObject = angular.fromJson(localStorageService.get(objectId));
    if (storageObject !== null) {
      $scope.objects.push(storageObject);
    }
  });
  $scope.searchedObjects = $scope.objects;

  // Timing
  $scope.loadingStartedAt = null;
  $scope.loadingFinishedAt = localStorageService.get('loadingFinishedAt') || null;
  $scope.indexingFinishedAt = null;
  
  // Progress
  $scope.loading = false;
  $scope.progress = 0;
  $scope.indexing = false;
  $scope.indexingProgress = 0;

  // Search
  $scope.search = '';
  $scope.searching = false;

  // Facets
  // Facets are generated for the '_type' attribute of all objects in FACEBOOK_OBJECTS
  // Used to filter objects by type
  $scope.facets = {};
  _.each(_.pluck(FACEBOOK_OBJECTS, 'url'), function(facet){
    $scope.facets[facet] = true;  
  });

  // Facebook API
  // Initiated when loading data
  var facebookApiInstance = null;

  // Load the search engine
  var searchEngine = fullproofSearchEngine($scope.objects, FACEBOOK_OBJECT_INDEXABLE_KEYS, 'facebookObjects',
    // Success callback
    function() {
      $scope.indexingProgress = 1;
      $scope.indexing = false;
      $scope.indexingFinishedAt = new Date().getTime();
      $scope.$apply();
    },
    // Error callback
    function() {
      $scope.$apply();
    },
    // Progress callback
    function(progress) {
      $scope.indexing = true;
      $scope.indexingProgress = progress;
      $scope.indexingFinishedAt = new Date().getTime();
      $scope.$apply();
    }
  );

  // Start the search engine if index has been already built
  // Index is built after objects have been loaded
  if ($scope.objects.length > 0) searchEngine.start();

  /*
   * Searches objects for a given search term
   * Returns the result in $scope.searchedObjects
   */
  $scope.searchObjects = function(search) {
    $scope.searching = true;
    if (search == '') {
      $scope.searchedObjects = $scope.objects;
      $scope.searching = false;
    }
    else {
      searchEngine.search(search, function(resultItems){
        $scope.searchedObjects = resultItems;
        $scope.searching = false;
        $scope.$apply();
      });
    }
  } 

  /*
   * Loads objects via the Facebook Graph API into $scope.objects
   * 
   * Requires a valid $scope.facebookApiToken
   * Objects to load are defined in config.js FACEBOOK_OBJECTS
   */
  $scope.load = function(){
    // Reset search, progress, errors and timer
    $scope.search = ''; 
    $scope.searchedObjects = $scope.objects;
    $scope.progress = 0;
    $scope.errors = [];
    $scope.warings = [];
    $scope.loading = true;
    $scope.loadingStartedAt = new Date().getTime();

    // Load API instance
    facebookApiInstance = facebookApi($scope.facebookApiToken);
    localStorageService.add('facebookApiToken', $scope.facebookApiToken);

    var completedCalls = 0;
    if ($scope.loadingFinishedAt)
      var since = Math.floor(parseInt($scope.loadingFinishedAt)/1000);
    
    _.each(FACEBOOK_OBJECTS, function(facebookObject) {
      // Send HTTP request
      var requestUrl = 'me/' + facebookObject.url;
  
      if (since) requestUrl += '?since=' + since;

      facebookApiInstance.get(requestUrl, 
        // Success callback
        function(data, status, headers, config) {
          _.each(data.data, function(responseObject){
            // Extend response objects with meta properties
            _.extend(responseObject, {_type: facebookObject.url});
            facebookObject.preview = facebookObject.preview || 'name';
            _.extend(responseObject, {_preview: getNestedAttribute(responseObject, facebookObject.preview)});
          
            // Save object unless already in list
            if (_.contains($scope.objectIds, responseObject.id) == false) {
              $scope.objectIds.push(responseObject.id);
              $scope.objects.push(responseObject);
              localStorageService.add('objectIds', angular.toJson($scope.objectIds));
              localStorageService.add(responseObject.id, angular.toJson(responseObject));
            }
          });

          // Update progress
          completedCalls += 1;
          $scope.progress = completedCalls/(completedCalls+facebookApiInstance.remainingCalls());
          $scope.loading = (facebookApiInstance.remainingCalls() > 0);

          // Update timer
          $scope.loadingFinishedAt = new Date().getTime();
          localStorageService.add('loadingFinishedAt', $scope.loadingFinishedAt);

          // Check if done
          if (!$scope.loading) onCompleted();
        },
        // Error callback
        function(data, status, headers, config) {
          if ( data.error !== undefined )
            $scope.$broadcast('app.notification.warning', data.error.message);
          else
            $scope.$broadcast('app.notification.warning', 'No network connectivity or unknown error');

          // Update progress 
          completedCalls += 1;
          $scope.progress = completedCalls/(completedCalls+facebookApiInstance.remainingCalls());
          $scope.loading = (facebookApiInstance.remainingCalls() > 0);

          // Update timer
          $scope.loadingFinishedAt = new Date().getTime();
          localStorageService.add('loadingFinishedAt', $scope.loadingFinishedAt);

          // Check if done
          if (!$scope.loading) onCompleted();
        });
    });
  };

  function onCompleted() {
    searchEngine.start();
  }

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

  /*
  * Resets everything
  */
  $scope.reset = function() {
    // Stop API calls
    // Note: Some callbacks from sent API calls may still be called
    if (facebookApiInstance !== null) {
      facebookApiInstance.stop();
    }

    // Stop indexing and clear index
    // Note: While the search engine is starting up it may not be stopped
    // since it works asynchronously
    if (searchEngine !== undefined && searchEngine !== null) {
      searchEngine.clear();
    }
    
    // Clear local storage
    localStorageService.clearAll();

    // Reset objects
    $scope.objectIds = [];
    $scope.objects = [];
    $scope.searchedObjects = [];
    $scope.loadingFinishedAt = null;
    $scope.loadingStartedAt = null;

    // Reset errors
    $scope.errors = [];
    $scope.Warnings = [];
    
    // Reset progress
    $scope.loading = false;
    $scope.progress = 0;
    $scope.indexing = false;
    $scope.indexingProgress = 0;

    // Reset search
    $scope.search = '';
    $scope.searching = false;
    $scope.searchReady = false;
  }

  /*
  * Returns the total crawl duration in seconds
  */
  $scope.getLoadingTime = function() {
    if ($scope.loadingStartedAt !== null 
      && $scope.loadingFinishedAt !== null 
      && $scope.loadingFinishedAt > $scope.loadingStartedAt)
      return ($scope.loadingFinishedAt-$scope.loadingStartedAt) / 1000;
    else
      return undefined;
  };

  /*
  * Returns the total indexing duration in seconds
  */
  $scope.getIndexingTime = function() {
    if ($scope.loadingStartedAt !== null 
      && $scope.indexingFinishedAt !== null 
      && $scope.loadingFinishedAt !== null 
      && $scope.indexingFinishedAt > $scope.loadingFinishedAt)
      return ($scope.indexingFinishedAt-$scope.loadingFinishedAt) / 1000;
    else
      return undefined;
  };

  /*
  * Returns a formatted string of the last update time
  */
  $scope.getLastUpdated = function() {
    if ($scope.loadingFinishedAt !== null)
      return new Date(parseInt(localStorageService.get('loadingFinishedAt'))).toTimeString();
    else 
      return "never";
  };

  /*
  * Toogles all facets' values between true and false
  * depending on the value of the first facet 
  */
  $scope.toggleFacets = function() {
    var firstFacet = !!$scope.facets[_.keys($scope.facets)[0]];
    console.log(firstFacet);
    _.each($scope.facets, function(facet, key) {
      $scope.facets[key] = !firstFacet;
    });
  };
});