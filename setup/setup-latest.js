
// in 'main.js': TS.signalAppReady() // app ready sent 
/*ex pg use:
	TS.onAppReady(UIinit)

	function UIinit() {
	}
*/
'use strict'

var TS = { //class:
loadNX: function(lib, xfoo) { //load and exec
	loadjs([ lib ], // now load ps
		{ success: function(){ 
			xfoo()
		} 
		})//load ps.js	
}//()
,loadIE: function() { //load fetch and reactive image poly, since not in IE
	loadjs([
		 '//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js'
		,'//cdn.jsdelivr.net/picturefill/3.0.3/picturefill.min.js'
		], { success: function(){
			console.log('loaded dependencyIE')
			loadjs.done('dependencyIE')
		}
	})
}
, appReady: false

,signalAppReady: function() {
	TS.appReady = true
}
, onAppReady: function(pinit) {
	if(TS.appReady) {
		console.log('app-ready!')
		pinit()
	} else {
		setTimeout(function() {//wait X milliseconds then loop and recheck if ready
			console.log(',')
			TS.onAppReady(pinit)//loop
		} ,60)
	}//else
}//()
}//class

// load stuff:
loadjs([ // load bowser
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js'
	], { success: function(){
			if(bowser.msie) {
				console.log('-you got IE, not edge')
				TS.loadIE()
			} else {
				loadjs.done('dependencyIE')
			}
	}, async: false
})

//load the needed libs
loadjs([
	 'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/flyd.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js'

	,'https://rawgit.com/topseed/topseed-turbo/master/release/topseed-turbo-latest.js'

	], { success: function(){
		console.log('setup libs loaded')
		$(document).ready(function () {// doc ready and libs loaded
			loadjs.done('keyLibs')
		})
	}, async: false
})

window.onbeforeunload = function (e) {
	console.log('please come back soon')
}