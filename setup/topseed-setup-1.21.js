
// in 'main.js': loadjs.done('app-ready') // page ready sent 
/*ex pg use:
	onAppReady(init)

	function init() {
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

function onAppReady(init) {
	loadjs.ready( ['app-ready'],
		{ success: function(){ 
			init() 
		} 
	})//ready()
}

loadjs([ // load bowser
	'https://cdn.rawgit.com/topseed/topseed-shellcache/master/vendor/bowser.min.js'
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
	,'https://cdn.rawgit.com/topseed/topseed-shellcache/master/vendor/js.cookie.min.js'

	,'https://cdn.rawgit.com/topseed/topseed-shellcache/master/release/shellcache-1.21.js'

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