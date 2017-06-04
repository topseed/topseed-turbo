
// in 'main.js': TS.signalAppReady() // app ready sent 
/*ex pg use:
	TS.onAppReady(UIinit)

	function UIinit() {
	}
*/
'use strict'

var TS = { //class:
_loadedComp : {'exComp': true} // don't load 2x: http://stackoverflow.com/questions/7958292/mimicking-sets-in-javascript
, loadComp: function($here, url, cb) { //load template, don't forget #comps
	if(url in TS._loadedComp) {//guard: we loaded it before, thank you very much
		console.log('already loaded')
		cb()
		return
	} else {
		fetch(url, {
			method: 'get'
		}).then(function(reSPonse) {
			if (!reSPonse.ok) {
				console.log('not ok')
				console.log(reSPonse)
				throw Error(reSPonse.statusText)
			}
			return reSPonse.text()
		}).then(function(txt) {
			console.log('loading (again?)')
			TS._loadedComp[url] = true
			$here.append( txt )
			cb()
		})
	}
}//()
,defineEl(elId, Klass) { //define and get element
	var el = customElements.get(elId)
	if(!el) // if it is not defined, define:
	customElements.define(elId, Klass)
	let m = document.querySelector(elId)
	return m
}
,loadNX: function(lib, xfoo) { //load and exec
	loadjs([ lib ], // now load ps
		{ success: function(){ 
			xfoo()
		} 
		})//load ps.js	
}//()

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
			console.log(',') // likey TS.signalAppReady() was not called
			TS.onAppReady(pinit)//loop
		} ,60)
	}//else
}//()
,loadIE: function() {
	loadjs([ 
		'//cdn.jsdelivr.net/es6-promise-polyfill/1.2.0/promise.min.js'
		,'//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js'
		,'//cdn.jsdelivr.net/picturefill/3.0.3/picturefill.min.js'
		// IE will not work w/ custom elements v1 due to js 'class'.
		], { success: function(){
			console.log('loaded IE, but no comps, SSR?')
			loadjs.done('IE')
		}
	})
}
,loadFF: function() { 
	loadjs([ 
		 'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bower_components/shadydom/shadydom.min.js'
		 ,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bower_components/custom-elements/custom-elements.min.js'
		], { success: function(){
			console.log('loaded FF')
			loadjs.done('FF')
		}
		, async: false
	})
}
,loadEdge: function() { 
	loadjs([ 
		 'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bower_components/shadydom/shadydom.min.js'
		 ,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bower_components/custom-elements/custom-elements.min.js'
		], { success: function(){
			console.log('loaded Edge')
			loadjs.done('Edge')
		}
		, async: false
	})
}
}//class

// load stuff:
loadjs([ // load bowser, should be in cache manifest 
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js'
	], { success: function(){
			console.log('bowser')
			if(bowser.msie) {
				console.log('you got IE, not Edge.')
				TS.loadIE()
			} else {
				loadjs.done('IE')
			}
			if(bowser.msedge ) {
				console.log('Edge')
				TS.loadEdge()
			} else {
				loadjs.done('Edge')
			}
			if(bowser.gecko ) {
				console.log('FF')
				TS.loadFF()
			} else {
				loadjs.done('FF')
			}
	}
})

//load the needed libs
loadjs([// these should be in cache manifest 
	 'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/flyd.min.js'
	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js'
	,'//cdn.jsdelivr.net/dot.js/1.1.1/doT.min.js' 

	,'https://cdn.rawgit.com/topseed/topseed-turbo/master/release/topseed-turbo-2.7.js'

	], { success: function(){
		console.log('key setup libs loaded')
		$(document).ready(function () {// doc ready and libs loaded
			loadjs.done('keyLibs')
		})
	}, async: false
})

loadjs.ready(['IE', 'Edge', 'FF'], {// polyfills
	success: function(){
		console.log('polyfills')
		loadjs.done('polyfills')
	}//suc
})

window.onbeforeunload = function (e) {
	console.log('please come back soon')
}