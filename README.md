# SmoothPage

SmoothPage loads pages, a single-page application implementation. 
It uses jquery slim, fetch, loosely coupled and does not load the app shell DOM, only content.
It requires jquery and js-Signals. In ie it requires fetch.
When using w/ side bar, you need to handle it.

This is a fork of SmoothState, SmoothState may be able to handle more corner cases.

Note: setup folder is loader helper, not documented.

Example use in main.js:


		SP.ScontentID ='#content-wrapper'
		SP.smoothPg.add(function(typ, $new, delta, $html) {

			if(SP.PRE==typ)  {//start
				console.log('SP', $new)
				//$('#content-wrapper').fadeTo(100,.2)

			}
			if(SP.PAGE==typ)  {//ready
				$(SP.ScontentID).html($new) // REQUIRED: add the new content
				//$('#content-wrapper').fadeTo(100,1)

			}//fi

		})// add signal


Also, there is example in example folder and another example <http://github.com/topseed/topseed>

Used by:
- http://masons-foundation.org
- http://rfidthings.com


For support: <http://gitter.im/topseed-demos/Lobby>