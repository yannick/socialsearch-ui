'use strict';

/*
* Main controller
*/
app.controller('MainCtrl', function ($scope, $http, facebookApi, localStorageService,
  fullproofSearchEngine, FACEBOOK_OBJECTS, FACEBOOK_FRIEND_OBJECTS,
  FACEBOOK_OBJECT_INDEXABLE_KEYS) {


  /* Scope variables */


  // Token
  $scope.facebookApiToken = localStorageService.get('facebookApiToken') || '';

  // Notifications
  $scope.warnings = [];
  $scope.errors = [];

  // Objects and search results
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

  // Search
  $scope.search = '';
  $scope.searching = false;

  // Facets
  $scope.facets = {};


  /* Event handlers */


  // Handle broadcasted notifications
  $scope.$on('LocalStorageModule.notification.error', function (event, message) {
    if (!_.contains($scope.errors, message)) {
      $scope.errors.push(message);
    }
  });
  $scope.$on('app.notification.error', function (event, message) {
    $scope.errors.push(message);
  });
  $scope.$on('facebookAPI.notification.warning', function (event, message) {
    if (!_.contains($scope.warnings, message)) {
      $scope.warnings.push(message);
    }
  });


  /* Initializations */


  // Load objects from local storage
  _.each($scope.objectIds, function (objectId) {
    var storageObject = angular.fromJson(localStorageService.get(objectId));
    if (storageObject !== null) {
      $scope.objects.push(storageObject);
    }
  });
  $scope.searchedObjects = $scope.objects;

  // Load facets
  // Facets are generated for the '_type' attribute of all objects in FACEBOOK_OBJECTS
  // Used to filter objects by type
  _.each(_.pluck(FACEBOOK_OBJECTS, 'url'), function (facet) {
    $scope.facets[facet] = true;
  });

  // Load Facebook API
  // Initialized when loading data
  var facebookApiInstance = null;

  // Load the search engine
  var searchEngine = fullproofSearchEngine('facebookObjects',
    // Success callback
    function () {},
    // Error callback
    function () {
      $scope.$broadcast('app.notification.error', 'Error loading search engine.');
    }
  );


  /* Scope methods */


  /*
   * Searches objects for a given search term
   * Returns the result in $scope.searchedObjects
   */
  $scope.searchObjects = function (search) {
    $scope.searching = true;
    if (search === '') {
      $scope.searchedObjects = $scope.objects;
      $scope.searching = false;
    }
    else {
      searchEngine.search(search, function (resultKeys) {
        $scope.searchedObjects = [];
        _.each(resultKeys, function (resultKey) {
          $scope.searchedObjects.push(_.findWhere($scope.objects, {_storage_id: resultKey}));
        });
        $scope.searching = false;
        $scope.$apply();
      });
    }
  };

  /*
   * Loads objects via the Facebook Graph API into $scope.objects
   *
   * Requires a valid $scope.facebookApiToken
   * Objects to load are defined in config.js
   */
  $scope.load = function () {
    // Load API instance
    facebookApiInstance = facebookApi($scope.facebookApiToken);
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

    var since = null;
    if ($scope.loadingFinishedAt) {
      since = Math.floor(parseInt($scope.loadingFinishedAt, 10) / 1000);
    }

    var loadedFriends = 0;

    function callSuccessCallback(responseObjects) {
      // Save objects unless already in list
      // Saves a stub of the object in local storage
      _.each(responseObjects, function (responseObject) {
        if (!_.contains($scope.objectIds, responseObject._storage_id)) {
          // Store full object in scope
          $scope.objectIds.push(responseObject._storage_id);
          $scope.objects.push(responseObject);

          // Store object stub in storage
          var objectStub = {id: responseObject.id, _for: responseObject._for,
            _for_name: responseObject._for_name, _storage_id: responseObject._storage_id,
            _preview: responseObject._preview, _type: responseObject._type, _stub: true};

          if (responseObject.picture) {
            objectStub.picture = responseObject.picture;
          }
          if (responseObject._type === 'friends') {
            objectStub.name = responseObject.name;
          }

          localStorageService.add('objectIds', angular.toJson($scope.objectIds));
          localStorageService.add(responseObject._storage_id, angular.toJson(objectStub));

          // Index object
          var text = loadIndexableTexts(responseObject, FACEBOOK_OBJECT_INDEXABLE_KEYS).join(' ');
          searchEngine.index(text, responseObject._storage_id);
        }
      });
    }

    // Helper function, recursively loads an object's string values of predefined keys
    // Valid keys are predefined as 'indexableKeys'
    function loadIndexableTexts(object, indexableKeys, objectTexts) {
      objectTexts = objectTexts || [];
      if (object === null) {
        return objectTexts;
      }

      _.each(_.keys(object), function (key) {
        if (typeof(object[key]) === 'object') {
          loadIndexableTexts(object[key], indexableKeys, objectTexts);
        } else if (_.contains(indexableKeys, key) && typeof(object[key]) === 'string' &&
          !_.contains(objectTexts, object[key])) {
          objectTexts.push(object[key]);
        }
      });

      return objectTexts;
    }

    function progressCallback(progress) {
      $scope.progress = progress;

      // Update timer
      $scope.loadingFinishedAt = new Date().getTime();
      localStorageService.add('loadingFinishedAt', $scope.loadingFinishedAt);
    }

    function meCompletedCallback() {
      // Completed loading user, load friends
      $scope.friends = _.where($scope.objects, {_type: 'friends'});
      localStorageService.add('friends', angular.toJson($scope.friends));

      /// For faster testing
      /// $scope.friends = [$scope.friends[0]];
      ///

      if ($scope.friends.length > 0) {
        $scope.progress = 0;
        $scope.loadingUser = $scope.friends[0].name + ' (1 of ' + $scope.friends.length + ')';
        facebookApiInstance.loadConnections($scope.friends[0].id, $scope.friends[0].name,
          FACEBOOK_FRIEND_OBJECTS, since, callSuccessCallback, progressCallback,
          friendCompletedCallback);
      } else {
        onDone();
      }
    }

    function friendCompletedCallback() {
      loadedFriends += 1;

      if (loadedFriends === $scope.friends.length) {
        onDone();
      } else {
        $scope.loadingUser = $scope.friends[loadedFriends].name + ' (' + (loadedFriends + 1) +
          ' of ' + $scope.friends.length + ')';
        $scope.progress = 0;
        facebookApiInstance.loadConnections($scope.friends[loadedFriends].id,
          $scope.friends[0].name, FACEBOOK_FRIEND_OBJECTS, since, callSuccessCallback,
          progressCallback, friendCompletedCallback);
      }
    }

    function onDone() {
      $scope.loading = false;
      $scope.indexing = true;

      // Complete indexing, then wait until engine ready for searching
      // Using a dummy search and waiting for a response to find out when it is ready
      searchEngine.complete(function () {
        searchEngine.search('me', function () {
          $scope.indexing = false;
          $scope.indexingFinishedAt = new Date().getTime();
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
      });
    }

    // Load user and then friend connections
    $scope.loadingUser = 'your Facebook data';
    facebookApiInstance.loadConnections('me', 'me', FACEBOOK_OBJECTS, since,
      callSuccessCallback, progressCallback, meCompletedCallback);
  };

  /*
   * Loads the object's Facebook data
   * Re-loads the data from Facebook if not stored in scope
   */
  $scope.loadObject = function (object) {
    // Load API instance
    facebookApiInstance = facebookApiInstance || facebookApi($scope.facebookApiToken);

    if (object._stub === true) {
      facebookApiInstance.get(object.id,
        // Success callback
        function (data) {
          var scopeObject = _.findWhere($scope.objects, {id: object.id});
          scopeObject = _.extend(object, data);
          scopeObject._stub = false;
        },
        // Error callback
        function (data) {
          var scopeObject = _.findWhere($scope.objects, {id: object.id});
          scopeObject = _.extend(object, {error: data.error.message});
          scopeObject._stub = false;
        }
      );
    }
  };

  /*
  * Resets everything
  */
  $scope.reset = function () {
    // Stop API calls
    // Note: Some callbacks from sent API calls may still be called
    if (facebookApiInstance !== null) {
      facebookApiInstance.stop();
    }

    // Stop indexing and clear index
    // Note: While the search engine is starting up it may not be stopped
    // since it works asynchronously
    if (typeof(searchEngine) !== undefined && searchEngine !== null) {
      searchEngine.reset();
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

    // Reset search
    $scope.search = '';
    $scope.searching = false;
    $scope.searchReady = false;
  };

  /*
  * Returns the total crawl duration in seconds
  */
  $scope.getLoadingTime = function () {
    if ($scope.loadingStartedAt !== null &&
      $scope.loadingFinishedAt !== null &&
      $scope.loadingFinishedAt > $scope.loadingStartedAt) {
      return ($scope.loadingFinishedAt - $scope.loadingStartedAt) / 1000;
    } else {
      return undefined;
    }
  };

  /*
  * Returns the total indexing duration in seconds
  */
  $scope.getIndexingTime = function () {
    if ($scope.loadingStartedAt !== null &&
      $scope.indexingFinishedAt !== null &&
      $scope.loadingFinishedAt !== null &&
      $scope.indexingFinishedAt > $scope.loadingFinishedAt) {
      return ($scope.indexingFinishedAt - $scope.loadingFinishedAt) / 1000;
    } else {
      return undefined;
    }
  };

  /*
  * Returns a formatted string of the last update time
  */
  $scope.getLastUpdated = function () {
    if ($scope.loadingFinishedAt !== null) {
      return new Date(parseInt(localStorageService.get('loadingFinishedAt'), 10)).toTimeString();
    } else {
      return 'never';
    }
  };

  /*
  * Toogles all facets' values between true and false
  * depending on the value of the first facet
  */
  $scope.toggleFacets = function () {
    var firstFacet = !!$scope.facets[_.keys($scope.facets)[0]];
    _.each($scope.facets, function (facet, key) {
      $scope.facets[key] = !firstFacet;
    });
  };
});