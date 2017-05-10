# topseed-turbo

topseed-turbo is inspired by https://github.com/miguel-perez/smoothState.js

topseed-turbo loads pages in a single-page application implementation. 
It uses jQuery slim, fetch, is loosely coupled and does not load the app shell DOM, only content.

It requires jQuery and js-signals. In IE it requires fetch.
When using with a sidebar, you need to handle the navigation.

topseed-turbo has evolved from a mirror of of SmoothState.js. 

Note: setup folder is loader helper, not documented.

Example use in main.js:


		TT.ScontentID ='#content-wrapper'
		TT.smoothPg.add(function(type, $new, delta, $html) {

			if(TT.PRE==type)  {//start
				console.log('SC', $new)
				//$('#content-wrapper').fadeTo(100,.2)

			}
			if(TT.PAGE==type)  {//ready
				$(TT.ScontentID).html($new) // REQUIRED: add the new content
				//$('#content-wrapper').fadeTo(100,1)

			}//fi

		})// add signal


There is an example in the /example folder other examples at
- <http://github.com/topseed/topseed-helloworlds>
- <http://github.com/topseed/topseed>

There is a loader that helps with legacy IE compatibility at
- <http://github.com/topseed/topseed-setup>


topseed-turbo is optionally used in topseed.
See topseed documentation how to degrade.

Used by:
- http://masons-foundation.org
- https://www.rfidthings.com
- https://appthings.io

For support: <http://gitter.im/topseed/Lobby>