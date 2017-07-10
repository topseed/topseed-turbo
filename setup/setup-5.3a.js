// in 'main.js': TS.signalAppReady() // app ready sent 
/*ex pg use:
	TS.onAppReady(UIinit)

	function UIinit() {
	}
*/
//'use strict'  // NOT in IE 11 w/ Class we can't

//polyfill for _load endsWith
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(searchString, position) {
		var subjectString = this.toString()
		if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
			position = subjectString.length
		}
		position -= searchString.length
		var lastIndex = subjectString.lastIndexOf(searchString, position)
		return lastIndex !== -1 && lastIndex === position
	}
}

var TS = { //class:

	_load: function(url, resolve, reject){
		var isCss = url.toLowerCase().endsWith('.css')
		var el = document.createElement(isCss?'css':'script')
		el.onload = function(){ //IE9 min
			resolve(url)
		}
		el.onerror = function(){ 
			reject(url)
		}
		if (isCss)
		{
			el.href = url
			el.type = 'text/css'
			el.rel = 'stylesheet'
			var ref = window.document['head'].appendChild(el)
		}
		else {
			console.log('_load:'+url)
			el.src = url
			el.async = true
			var ref = window.document.getElementsByTagName('script')[0]
			ref.parentNode.insertBefore(el, ref)
		}
	}

	, load: function(url, doneKey){
		return new Promise(function (resolve, reject) {
			TS._load(url, resolve, reject)
		})
		.then(function(){if (doneKey != null) TS.done(doneKey)})
		.catch(function(e){ console.log('load catch:'+e)})

	}

	, ready: function(keyArr, func)
	{
		if (!TS._loadStream)
			TS._loadStream = flyd.stream()
		var mapContainsArray = function(superset, subset) {
			if (0 === subset.length) {
				return false
			}
			return subset.every(function (value) {
				return (superset[value]!=null)
			})
		}	
		var filter = function(key){
			TS._loadStream[key] = key //persist the key
			if (mapContainsArray(TS._loadStream, keyArr)) {
				func()
			}
		}
		flyd.on(filter, TS._loadStream) //bind	
	}

	, done: function(key){
		if (!TS._loadStream)
			TS._loadStream = flyd.stream()
		TS._loadStream(key) //exec
		return Promise.resolve(key)
	}

	, signalAppReady: function() {
		TS.appReady = true
	}

	, appReady: false

	, onAppReady: function(pinit) {
		if (TS.appReady  && 'undefined' != typeof jQuery) { // wait for libs loaded.
			console.log('app-ready!')
			pinit()
		} else {
			setTimeout(function() {//wait X milliseconds then loop and recheck if ready
				console.log(',') // likey TS.signalAppReady() was not called
				TS.onAppReady(pinit)//loop
			} ,60)
		}//else
	}//()

	, loadOnAppReady: function(lib, pinit){
		if(TS.appReady) {
			console.log('main?')
			TS.load(lib).then(pinit)
		} else {
			setTimeout(function() {//wait X milliseconds then loop and recheck if ready
				console.log(',') // likey TS.signalAppReady() was not called
				TS.loadOnAppReady(lib, pinit)//loop
			} ,60)
		}//else
	}

 	, loadIE: function() { 
		if (bowser.msie || !bowser.a)
		{
			return Promise.all([
				TS.load('//cdn.jsdelivr.net/fetch/2.0.1/fetch.min.js')
				, TS.load('//cdn.jsdelivr.net/picturefill/3.0.3/picturefill.min.js')
			])
		}	
		return Promise.resolve('isNotIE')
	}

	, loadPolyfills: function(){
		TS.loadIE()
		.then(function(){TS.done('polyfills')})
	}

	, loadKeylibs: function() {
		return Promise.all([
			TS.load('https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/js.cookie.min.js')
			, TS.load('https://unpkg.com/topseed-util@24.0.0/PLX.js') // key part for comp com
		])
		.then(function(){TS.done('keyLibs')})
	}

	, loadFRPAndBowser: function() {
		return Promise.all([
			TS.load('https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/flyd.min.js', 'frp')
			, TS.load('https://cdn.rawgit.com/topseed/topseed-turbo/master/vendor/bowser.min.js', 'bowser')
		])
		.then(function(){Promise.all([
				TS.loadPolyfills()
				, TS.loadKeylibs()
				, TS.load('/_js/main.js', 'main')
			])
		})
		.catch(function(e){ console.log('loadFRPAndBowser catch:'+e)})
	}

	, loadPromise: function() {
		if (!window.Promise)
			TS._load('//cdn.jsdelivr.net/es6-promise-polyfill/1.2.0/promise.min.js', TS.loadFRPAndBowser)
		else
			TS.loadFRPAndBowser() 
	}

}//class

// load stuff:
TS.loadPromise() //etc


window.onbeforeunload = function (e) {
	console.log('please come back soon')
}