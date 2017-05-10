
// in 'main.js': ST.signalAppReady() // app ready sent 
/*ex pg use:
	ST.onAppReady(UIinit)

	function UIinit() {
	}
*/
'use strict'

var ST = { //class:
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
	ST.appReady = true
}
, onAppReady: function(pinit) {
	if(ST.appReady) {
		console.log('app-ready!')
		pinit()
	} else {
		setTimeout(function() {//wait X milliseconds then loop and recheck if ready
			console.log('.')
			ST.onAppReady(pinit)//loop
		} ,40)
	}//else
}//()
}//class

// load stuff:
console.log('ie check:')
loadjs([ // load bowser
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js'
	], { success: function(){
			if(bowser.msie) {
				console.log('-you got IE, not edge')
				ST.loadIE()
			} else {
				loadjs.done('dependencyIE')
			}
	}, async: false
})

//load the needed libs
loadjs([
	'//cdn.jsdelivr.net/js-signals/1.0.0/signals.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/flyd.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js'
	,'https://rawgit.com/topseed/topseed-turbo/master/release/topseed-turbo-2.0.js'

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