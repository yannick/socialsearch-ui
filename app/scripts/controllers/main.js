'use strict';

/**
* Main controller
*/
app.controller('MainCtrl', function ($scope, $http, facebookApi, localStorageService, fullproofSearchEngine, FACEBOOK_OBJECTS, FACEBOOK_FRIEND_OBJECTS, FACEBOOK_OBJECT_INDEXABLE_KEYS) {
  

  /* Scope variables */


  // Token
  $scope.facebookApiToken = localStorageService.get('facebookApiToken') || '';

  // Notifications
  $scope.warnings = [];
  $scope.errors = [];
  
  // Objects and search results
  // Objects are saved in local storage separately with their 'id' as key
  // All retrieved Facebook objects are stored in $scope.objects
  // and those matching the current search in $scope.searchedObjects
  $scope.objectIds = angular.fromJson(localStorageService.get('objectIds')) || [];
  $scope.objects = [];
  $scope.searchedObjects = [];
  $scope.friends = angular.fromJson(localStorageService.get('friends')) || [];

  // Timing
  $scope.loadingStartedAt = null;
  $scope.loadingFinishedAt = localStorageService.get('loadingFinishedAt') || null;
  $scope.indexingFinishedAt = null;
  
  // Progress
  $scope.loading = false;
  $scope.loadingUser = null;
  $scope.progress = 0;
  $scope.indexing = false;
  $scope.indexingProgress = 0;

  // Search
  $scope.search = '';
  $scope.searching = false;

  // Facets
  $scope.facets = {};


  /* Event handlers */


  // Handle broadcasted notifications
  $scope.$on('LocalStorageModule.notification.error', function(event, message) {
   if (!_.contains($scope.errors, message)) $scope.errors.push(message);
  });
  $scope.$on('facebookAPI.notification.warning', function(event, message) {
    if (!_.contains($scope.warnings, message)) $scope.warnings.push(message);
  });

  /* Initializations */


  // Load objects from local storage
  _.each($scope.objectIds, function(objectId) {
    var storageObject = angular.fromJson(localStorageService.get(objectId));
    if (storageObject !== null) {
      $scope.objects.push(storageObject);
    }
  });
  $scope.searchedObjects = $scope.objects;

  // Load facets
  // Facets are generated for the '_type' attribute of all objects in FACEBOOK_OBJECTS
  // Used to filter objects by type
  _.each(_.pluck(FACEBOOK_OBJECTS, 'url'), function(facet){
    $scope.facets[facet] = true;  
  });

  // Load Facebook API
  // Initialized when loading data
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


  /* Scope methods */


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
   * Objects to load are defined in config.js
   */
  $scope.load = function() {
    // Load API instance
    facebookApiInstance = facebookApiInstance || facebookApi($scope.facebookApiToken);
    localStorageService.add('facebookApiToken', $scope.facebookApiToken);

    // Reset search, progress, errors and timer
    $scope.search = '';
    $scope.searchedObjects = $scope.objects;
    $scope.progress = 0;
    $scope.errors = [];
    $scope.warnings = [];
    $scope.loading = true;
    $scope.loadingUser = null;
    $scope.loadingStartedAt = new Date().getTime();

    if ($scope.loadingFinishedAt)
      var since = Math.floor(parseInt($scope.loadingFinishedAt)/1000);

    // Load user and then friend connections
    $scope.loadingUser = 'your Facebook data';
    facebookApiInstance.loadConnections('me', 'me', FACEBOOK_OBJECTS, since, callSuccessCallback,
      progressCallback, meCompletedCallback);
    var loadedFriends = 0;

    var currentLoadingUserId = null;

    function callSuccessCallback(responseObjects, userId) {
      // Save objects unless already in list
      // Saves a stub of the object in local storage
      _.each(responseObjects, function(responseObject) {
        if (_.contains($scope.objectIds, responseObject.id) == false) {
          var storageId = userId + "__" + responseObject.id;

          $scope.objectIds.push(storageId);
          $scope.objects.push(responseObject);

          var objectStub = {id: responseObject.id, _for: responseObject._for,
            _for_name: responseObject._for_name, _preview: responseObject._preview,
            _type:responseObject._type, _stub: true};

          localStorageService.add('objectIds', angular.toJson($scope.objectIds));
          localStorageService.add(storageId, angular.toJson(objectStub));
        }
      });
    }

    function progressCallback(progress) {
      $scope.progress = progress;

      // Update timer
      $scope.loadingFinishedAt = new Date().getTime();
      localStorageService.add('loadingFinishedAt', $scope.loadingFinishedAt);
    }

    function meCompletedCallback(userId) {
      // Completed loading user, load friends
      $scope.friends = _.where($scope.objects, {_type: 'friends'});
      localStorageService.add('friends', angular.toJson($scope.friends));

      /// For faster testing
      /// $scope.friends = [$scope.friends[0]];
      ///

      $scope.progress = 0;
      $scope.loadingUser = $scope.friends[0].name + " (1 of " + $scope.friends.length + ")";
      facebookApiInstance.loadConnections($scope.friends[0].id, $scope.friends[0].name,
        FACEBOOK_FRIEND_OBJECTS, since, callSuccessCallback, progressCallback,
        friendCompletedCallback);
    }

    function friendCompletedCallback(userId) {
      loadedFriends += 1;

      if (loadedFriends == $scope.friends.length) {
        $scope.loading = false;
        searchEngine.start();
      } else {
        $scope.loadingUser = $scope.friends[loadedFriends].name + " (" + (loadedFriends+1) +
          " of " + $scope.friends.length + ")";
        $scope.progress = 0;
        facebookApiInstance.loadConnections($scope.friends[loadedFriends].id,
          $scope.friends[0].name, FACEBOOK_FRIEND_OBJECTS, since, callSuccessCallback,
          progressCallback, friendCompletedCallback);
      }
    }

  }

  /*
   * Loads the object's Facebook data
   * Re-loads the data from Facebook if not stored in scope
   */
  $scope.loadObject = function(object) {
    // Load API instance
    facebookApiInstance = facebookApiInstance || facebookApi($scope.facebookApiToken);

    if (object._stub == true) {
      facebookApiInstance.get(object.id,
        // Success callback
        function(data, status, headers, config) {
          var scopeObject = _.findWhere($scope.objects, {id: object.id});
          scopeObject = _.extend(object, data);
          scopeObject._stub = false;
        },
        // Error callback
        function(data, status, headers, config) {
          var scopeObject = _.findWhere($scope.objects, {id: object.id});
          scopeObject = _.extend(object, {error: data.error.message});
          scopeObject._stub = false;
        }
      );
    }
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
    if (typeof(searchEngine) !== undefined && searchEngine !== null) {
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
    $scope.friends = [];

    // Reset errors
    $scope.errors = [];
    $scope.warnings = [];
    
    // Reset progress
    $scope.loading = false;
    $scope.loadingUser = null;
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
    _.each($scope.facets, function(facet, key) {
      $scope.facets[key] = !firstFacet;
    });
  };
});