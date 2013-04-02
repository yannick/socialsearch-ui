SocialSearch UI for Facebook
============================

An app to retrieve and view a user's available Facebook data, built with AngularJS and the Facebook Graph API.

See a demo at http://www.animyeboah.com/projects/facebook-data-search/

Facebook API limitations
------------------------

Facebook limits the allowed frequency of API calls and item size of batch calls. Limits for the call frequency and batch size are configured in `app/scripts/services/facebook-api.js`.

Requirements
------------

The following packages are required for development: 

- [node 0.8 and npm](http://nodejs.org/download/) 
- [bower](http://twitter.github.com/bower/) (HTML/CSS/JavaScript package manager) 
- [grunt](http://gruntjs.com/getting-started) (JavaScript task runner)

Development
-----------

1. Run `npm install && bower install` to install all dependencies
2. Run `grunt server` to start a test server

To deploy: 

3. Run `grunt` to receive a `/dist` folder ready for deployment