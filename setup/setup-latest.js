// https://rawgit.com/

// in 'main.js': loadjs.done('app-ready') // page ready sent 

/*ex pg use:
	function init() {
	}
	loadjs.ready(['app-ready'], {// loaded start up js libs
		success: function(){
			init()
		}
	})
*/
'use strict'

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
	'//cdn.jsdelivr.net/js-signals/1.0.0/signals.min.js'
	,'https://cdn.rawgit.com/puppetmaster3/smoothState.js/master/deps/js.cookie.min.js'

	,'https://rawgit.com/puppetmaster3/smoothState.js/master/release/SP_/-latest.js'

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