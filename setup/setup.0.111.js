'use strict'

var _loadStarted = new Date().getTime()

var A = 
	{ 
	stateA: new signals.Signal()	
	,inAction : false // set to true when user acts; false when effect is done
	,loaded : false
	,PRE : '_pre-action'
	,PAGE : '_new-page'
	//,LOADED : '_loaded'

	,act: function (arg) {
		A.stateA.dispatch(arg, window.location)
	}//()

	,onLoaded: function(cb) { // on loading + riot compile
		if(A.loaded) {
			cb()
		} //fi
	else {
		A.stateA.addOnce(function(arg1, arg2) {
			console.log(arg1)
			cb()
			return false
		})//added once
	}//else

	}//()
}//
//> ====================================================================
/*ex pg use:
	function init() {
		...
	}//()
	A.onLoaded(init)
*/

// load <====================================================================
loadjs([ // load bowser
	'https://cdn.rawgit.com/topseed/topseed-npm/master/v1.10/deps/bowser.min.js'
	], { success: function(){
			if(bowser.msie) {
				console.log('you got ie, not edge')
				loadIE()
			} else {
				loadjs.done('dependencyIE')
			}
	}, async: false
})

function loadIE() { //load fetch, since not in IE
	loadjs([
		 '//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js'
		,'//cdn.jsdelivr.net/picturefill/3.0.3/picturefill.min.js'
		], { success: function(){
			console.log('loaded dependencyIE')
			loadjs.done('dependencyIE')
		}, async: false
	})
}

loadjs([
	 '//cdn.jsdelivr.net/jquery/3.2.1/jquery.min.js'
	 //,'//d2wy8f7a9ursnm.cloudfront.net/bugsnag-3.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-npm/master/v1.10/deps/js.cookie.min.js'
	], { success: function(){
		console.log('setup libs loaded!')
		loadjs.done('keyLibs')
	}, async: false
})
// foo <====================================================================

function preLImg(arg) { // start loading an image so browser has it, for example in timeout of main page
	var imag = new Image()
	imag.src = arg
}
