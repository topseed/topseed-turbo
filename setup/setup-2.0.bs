
// in 'main.js': signalAppReady() // app ready sent 
/*ex pg use:
	onAppReady(UIinit)

	function UIinit() {
	}
*/
'use strict'

function loadNX(lib, xfoo) { //load and exec
	loadjs([ lib ], // now load ps
		{ success: function(){ 
			xfoo()
		} 
		})//load ps.js	
}

// load stuff:
console.log('ie check:')
loadjs([ // load bowser
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js'
	], { success: function(){
			if(bowser.msie) {
				console.log('-you got IE, not edge')
				loadIE()
			} else {
				loadjs.done('dependencyIE')
			}
	}, async: false
})
function loadIE() { //load fetch and reactive image poly, since not in IE
	loadjs([
		 '//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js'
		,'//cdn.jsdelivr.net/picturefill/3.0.3/picturefill.min.js'
		], { success: function(){
			console.log('loaded dependencyIE')
			loadjs.done('dependencyIE')
		}
	})
}

window.appSetup = null// signal
window.appReady = false
loadjs([
	'//cdn.jsdelivr.net/js-signals/1.0.0/signals.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js'

	,'https://rawgit.com/topseed/topseed-turbo/master/release/topseed-turbo-2.0.js'

	], { success: function(){
		console.log('setup libs loaded')
		$(document).ready(function () {// doc ready and libs loaded
			//app ready
			window.appSetup = new signals.Signal()	

			loadjs.done('keyLibs')
		})
	}, async: false
})
function signalAppReady() {
	window.appReady = true
	window.appSetup.dispatch('app-ready')
}
function onAppReady(pinit) {
	if(appReady) {
		console.log('app-ready!')
		pinit()
	} else if(appSetup) {
		appSetup.addOnce(function(e){
			console.log('app-ready!!')
			pinit() 
		})//app 
	} else {
		setTimeout(function() {//wait X milliseconds then recheck
			console.log('.')
			onAppReady(pinit)
		} ,50)
	}//else
}//()

window.onbeforeunload = function (e) {
	console.log('please come back soon')
}