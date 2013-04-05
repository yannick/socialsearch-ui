'use strict';

/*
* App module
* Loads module dependencies and sets up routing
*/

var app = angular.module('app', [
  'filters.truncate', 'filters.facetFilter',
  'services.facebookApi', 'services.fullproofSearchEngine',
  'LocalStorageModule'
]);

app.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });
});