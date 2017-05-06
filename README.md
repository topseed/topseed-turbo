# topseed-shellcache

Shellcache is inspired by https://github.com/miguel-perez/smoothState.js

Shellcache loads pages in a single-page application implementation. 
It uses jQuery slim, fetch, is loosely coupled and does not load the app shell DOM, only content.

It requires jQuery and js-signals. In IE it requires fetch.
When using with a sidebar, you need to handle the navigation.

Shellcache has evolved from a mirror of of SmoothState.js. 

Note: setup folder is loader helper, not documented.

Example use in main.js:


		SC.ScontentID ='#content-wrapper'
		SC.smoothPg.add(function(type, $new, delta, $html) {

			if(SC.PRE==type)  {//start
				console.log('SC', $new)
				//$('#content-wrapper').fadeTo(100,.2)

			}
			if(SC.PAGE==type)  {//ready
				$(SC.ScontentID).html($new) // REQUIRED: add the new content
				//$('#content-wrapper').fadeTo(100,1)

			}//fi

		})// add signal


Also, there is example in example folder and another example <http://github.com/topseed/topseed>

Shellcache is optionally used in topseed.
See topseed documentation how to degrade.

Used by:
- http://masons-foundation.org
- https://www.rfidthings.com
- https://appthings.io

For support: <http://gitter.im/topseed-demos/Lobby>