'use strict';

/*
* Facebook Data Search App
*/

var app = angular.module('fbDataSearchApp', ['filters']);

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