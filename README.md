SocialSearch UI for Facebook
============================

An app to search a user's available Facebook data, built with AngularJS and the Facebook Graph API.

- Retrieves all user data from the Facebook API with only an access token, which can be obtained for example at https://developers.facebook.com/tools/explorer/
- Uses fulltext search indexing to make the data searchable
- Allows filtering by object type (e.g. friends, likes, posts, etc.) with search facets

Facebook API limitations
------------------------

Facebook limits the allowed frequency of API calls and item size of batch calls. Depending on the access token and API settings used (see below), the API may return only a subset of the data. From experience, the API is also not always reliable and may throw some errors from time to time.

Development
-----------

The following packages are required for development:

- [node 0.8 and npm](http://nodejs.org/download/)
- [bower](http://twitter.github.com/bower/) (HTML/CSS/JavaScript package manager)
- [grunt](http://gruntjs.com/getting-started) (JavaScript task runner)

Setting up build tools:

1. Run `npm install && bower install` to install all dependencies
2. Run `grunt server` to start a test server

Deploying:

3. Run `grunt` to receive a `/dist` folder ready for deployment

Configuration
-------------

There is a configuration file `app/config.js` which contains:

- A list of all objects to be fetched from the Facebook Graph API
- The keys of Facebook objects to be indexed
- Fine-tuning for the Facebook API
 - Rate limit for API calls
 - Size limit for batch calls
 
 
Code: Anim Yeboah
Idea, Funding & Project Lead: Yannick Koechlin
 
copyright 2013 Yannick Koechlin

if you want to use/extend this please drop me a message and i will attach a licence.

