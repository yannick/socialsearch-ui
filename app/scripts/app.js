'use strict';

/*
* Facebook Data Search App
*/

var app = angular.module('app', [
  'filters.truncate', 'filters.attributeFilter',
  'services.facebookApi'
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