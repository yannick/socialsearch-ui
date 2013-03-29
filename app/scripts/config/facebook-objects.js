'use strict';

/*
* List of all objects to be fetched from the Facebook Graph API
* See https://developers.facebook.com/docs/reference/api
*
* The 'preview' attribute sets the object attribute to be shown as preview (defaults to 'name')
*/
var facebookObjects = [
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
  { url: 'outbox'            , preview: 'message' },
  { url: 'photos'            , preview: 'picture' },
  { url: 'photos/uploaded'   , preview: 'picture' },
  { url: 'pokes'             , preview: 'from.name' },
  { url: 'posts'             , preview: 'message' },
  { url: 'questions'         , preview: 'question' },
  { url: 'score'             , preview: 'url' },
  { url: 'statuses'          , preview: 'message' },
  { url: 'subscribedto'      },
  { url: 'subscribers'       },
  { url: 'tagged'            },
  { url: 'television'        },
  { url: 'updates'           , preview: 'message' },
  { url: 'videos'            }           
];