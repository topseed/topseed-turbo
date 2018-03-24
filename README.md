# topseed-turbo

DEPRECATED: use https://github.com/topseed/turbo-rotuer for new stuff

topseed-turbo is inspired by https://github.com/miguel-perez/smoothState.js

topseed-turbo loads pages in a single-page application implementation. 
It uses jQuery slim, fetch and flyd, is loosely coupled and does not load the app shell DOM, only content.

topseed-turbo (TT) has evolved from a mirror of of SmoothState.js. 

Note: setup folder (TS) is loader helper.

Example use in main.js:

	function startApp(){
		
		TS.signalAppReady()

		TT.ScontentID ='#content-wrapper'
		TT.handle(function(evt) {
			console.log(':')
			if (TT.PRE == evt.typ)  {//start
				console.log(evt.$new)
				//$('#content-wrapper').fadeTo(100,.2)
			}
			if (TT.PAGE == evt.typ)  {//new pg loaded
				$(TT.ScontentID).html(evt.$new)
				//$('#content-wrapper').fadeTo(100,1)
			}
		})

		})//startApp()


There is an example in the /example folder, other examples at
- <http://github.com/topseed/topseed-helloworld>
- <http://github.com/topseed/topseed>

topseed-turbo is optionally used in topseed.
See topseed documentation how to degrade.

Used by:
- http://masons-foundation.org
- https://www.rfidthings.com
- https://appthings.io

For support: <http://gitter.im/topseed/Lobby>
