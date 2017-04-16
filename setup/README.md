# setup.js

When using .js in front end creation or development, some pattern implementations are commonly useful. This is ~450 bytes .js file used by topseed projects and we are always looking for things to remove from here. 

You can use it as well.

Features:

- fetch() helper, as XHR and Ajax are superceded. (using API is Cloud v2)

- use w/ SPA (ex: smoothstate.com )

Above 2 allow for cross platform native mobile ( one example is cordova or build.phonegap.com)

- use with JWT and basic auth

- observer pattern, aka listener, dispatcher, events, and loosely coupled ( http://github.com/millermedeiros/js-signals/wiki/Comparison-between-different-Observer-Pattern-implementations )

- practical derivative implementation of Flux

- .js framework agnostic, but we like RIOT

- depends on muicss/loadjs and js signals; load before

- loads and uses js-cookie and bowser from CDN

- loads bugsnag and latest jQuery v3.x.

Version naming is x.y.z
For older release view git history.

Use from CDN as, make sure you get the latest version number, older versions are deprecated quickly:
- <https://cdn.rawgit.com/topseed/topseed-npm/master/v1/setup-1.0.2.js>

Look at the * ex.html * here of how it is loaded in head.

	<head>
		<script src="https://cdn.rawgit.com/topseed/topseed-npm/master/v1/deps/loadjs.min.js" type="text/javascript"></script>
		<script src="//cdn.jsdelivr.net/js-signals/1.0.0/signals.min.js" type="text/javascript"></script>
		<script src="https://cdn.rawgit.com/topseed/topseed-npm/master/v1/setup-1.0.2.js" type="text/javascript"></script>
	</head>

Then in your script something like:

	'use strict'
	loadjs.ready(['dependencyIE', 'keyLibs'], {// loaded setup
		success: function(){
		console.log('loading app libs ex:' )
		loadjs([
			'https://cdn.rawgit.com/topseed/topseed-npm/master/v1/deps/jquery.smoothState.js',
			'//cdn.jsdelivr.net/riot/3.3.2/riot+compiler.min.js'

			], { success: function(){
				console.log('loaded libs!')
				startApp()
			}
		})//loadjs
		}//suc
	})
	function startApp(){
		console.log('starting app:')
	}

And then you can use it on page like:

	function init() {
		...
	}
	sP.onSetup(init)

