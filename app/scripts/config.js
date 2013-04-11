'use strict';

/*
* List of all objects to be fetched from the Facebook Graph API
* for the current user and for the user's friend
* See https://developers.facebook.com/docs/reference/api
*
* The 'preview' attribute sets the object attribute to be shown as preview (defaults to 'name')
*
* All relevant Facebook user connections included, with the following exceptions: 
*   - pokes: Excluded due to a bug in the API (wrong pagination returned by the Facebook API)
*   - notifications: Requires the 'manage_notifications' permission
*   - payments: Can only be called with an app access token
*
* For friend connections, the following connections are not supported by the API
*  - inbox
*  - outbox
*  - updates
*  - friends
*  - friendlists
*
*/
app.constant('FACEBOOK_OBJECTS', [
  { url: 'accounts'          },
  { url: 'achievements'      , preview: 'achievement.title' },
  { url: 'activities'        },
  { url: 'albums'            },
  { url: 'apprequests'       , preview: 'application' },
  { url: 'books'             },
  { url: 'checkins'          , preview: 'place.name' },
  { url: 'events'            },
  { url: 'family'            },
  { url: 'friendlists'       },
  { url: 'friends'           },
  { url: 'games'             },
  { url: 'groups'            },
  { url: 'inbox'             , preview: 'comments.data.message' },
  { url: 'interests'         },
  { url: 'likes'             },
  { url: 'links'             },
  { url: 'locations'         , preview: 'place.name' },
  { url: 'movies'            },
  { url: 'music'             },
  { url: 'notes'             , preview: 'subject' },
  //{ url: 'notifications' },
  { url: 'outbox'            , preview: 'message' },
  //{ url: 'payments' },
  { url: 'photos'            , preview: 'picture' },
  { url: 'photos/uploaded'   , preview: 'picture' },
  //{ url: 'pokes'             , preview: 'from.name' },
  { url: 'posts'             , preview: 'message' },
  { url: 'questions'         , preview: 'question' },
  { url: 'scores'            , preview: 'application' },
  { url: 'statuses'          , preview: 'message' },
  { url: 'subscribedto'      },
  { url: 'subscribers'       },
  { url: 'tagged'            },
  { url: 'television'        },
  { url: 'updates'           , preview: 'message' },
  { url: 'videos'            }           
]);

app.constant('FACEBOOK_FRIEND_OBJECTS', [
  { url: 'accounts'          },
  { url: 'achievements'      , preview: 'achievement.title' },
  { url: 'activities'        },
  { url: 'albums'            },
  { url: 'apprequests'       , preview: 'application' },
  { url: 'books'             },
  { url: 'checkins'          , preview: 'place.name' },
  { url: 'events'            },
  { url: 'family'            },
  //{ url: 'friendlists'       },
  //{ url: 'friends'           },
  { url: 'games'             },
  { url: 'groups'            },
  //{ url: 'inbox'             , preview: 'comments.data.message' },
  { url: 'interests'         },
  { url: 'likes'             },
  { url: 'links'             },
  { url: 'locations'         , preview: 'place.name' },
  { url: 'movies'            },
  { url: 'music'             },
  { url: 'notes'             , preview: 'subject' },
  //{ url: 'notifications' },
  //{ url: 'outbox'            , preview: 'message' },
  //{ url: 'payments' },
  { url: 'photos'            , preview: 'picture' },
  { url: 'photos/uploaded'   , preview: 'picture' },
  //{ url: 'pokes'             , preview: 'from.name' },
  { url: 'posts'             , preview: 'message' },
  { url: 'questions'         , preview: 'question' },
  { url: 'scores'            , preview: 'application' },
  { url: 'statuses'          , preview: 'message' },
  { url: 'subscribedto'      },
  { url: 'subscribers'       },
  { url: 'tagged'            },
  { url: 'television'        },
  //{ url: 'updates'           , preview: 'message' },
  { url: 'videos'            }
]);

/*
 * Keys of Facebook objects to be indexed
 * Specified keys will also be indexed if they are nested e.g. {from: {name: "name"}}
 */
app.constant('FACEBOOK_OBJECT_INDEXABLE_KEYS', [
  "_for_name", // Meta attribute containing the name of the object's owner
  "name",
  "description",
  "location",
  "category",
  "message",
  "story",
  "type",
  "title"
]);

/*
 * Fine-tuning for the Facebook API
 * - Rate limit in miliseconds for API calls
 * - Size limit for batch calls
 */
app.constant('FACEBOOK_API_RATE_LIMIT', 1000);
app.constant('FACEBOOK_API_BATCH_SIZE', 15);
