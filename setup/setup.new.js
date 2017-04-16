'use strict'

// load <====================================================================
loadjs([ // load bowser
	'https://cdn.rawgit.com/puppetmaster3/smoothState.js/master/deps/bowser.min.js'
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
		}
	})
}

loadjs([
	 //,'//d2wy8f7a9ursnm.cloudfront.net/bugsnag-3.min.js'
	'https://cdn.rawgit.com/puppetmaster3/smoothState.js/master/deps/js.cookie.min.js'
	,'//code.jquery.com/jquery-3.2.1.slim.min.js'
	,'https://rawgit.com/puppetmaster3/smoothState.js/master/release/sP.new.js'
	//'https://cdn.rawgit.com/puppetmaster3/smoothState.js/master/release/sP.new.js'

	], { success: function(){
		console.log('setup libs loaded!')
		loadjs.done('keyLibs')
	}, async: false
})
// other <====================================================================

function preLImg(arg) { // start loading an image so browser has it ready
	var imag = new Image()
	imag.src = arg
}
