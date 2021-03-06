
// in 'main.js': TS.signalAppReady() // app ready sent 
/*ex pg use:
	TS.onAppReady(UIinit)

	function UIinit() {
	}
*/
'use strict'

var TS = { //class:
_loadedComp : {'exComp': true} // don't load 2x
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

, isCReg: function(name) {
	if (window.creg && window.creg[name])
		return window.creg[name]
	return false
}

, cReg: function(name, obj) { // register a component
	if(!window.creg)
		window.creg = {}
	window.creg[name] = obj 
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
		], { success: function(){
			console.log('loaded IE')
			loadjs.done('IE')
		}//, async: false
	})
}
,loadNotChrome: function() {
	loadjs([
		'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bower_components/webcomponentsjs/webcomponents.js'
		], { success: function(){
			console.log('loaded NotChrome')
			loadjs.done('NotChrome')
		}//, async: false
	})
}
}//class

// load stuff:
loadjs([ // load bowser, should be in cache manifest 
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js'
	], { success: function(){

			console.log('bowser')
			if(bowser.msie||!bowser.a) { // ie or worse
				console.log('you got IE, not Edge.')
				TS.loadIE()
			} else {
				loadjs.done('IE')
			}
			
			if(!bowser.blink) {
				console.log('NotChrome')
				TS.loadNotChrome()
			} else {
				loadjs.done('NotChrome')
			}

	}
})

//bower install Polymer/polymer#^1.0.0

//load the needed libs
loadjs([ // should be in cache manifest 
	'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/flyd.min.js'
	], { success: function(){
		loadjs([// these should be in cache manifest 
			'https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js'
			,'//cdn.jsdelivr.net/dot.js/1.1.1/doT.min.js' 

			,'https://cdn.rawgit.com/topseed/topseed-turbo/master/release/topseed-turbo-3.0.js'

			], { success: function(){
				console.log('keyLibs')
				$(document).ready(function () {// doc ready and libs loaded
					console.log('$')
					loadjs.done('keyLibs')
				})
			}//, async: false
		})
	}
})

loadjs.ready(['IE','NotChrome'], {// polyfills
	success: function(){
		console.log('polyfills')
		loadjs.done('polyfills')
	}//suc
})

window.onbeforeunload = function (e) {
	console.log('please come back soon')
}