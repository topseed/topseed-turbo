// https://rawgit.com/

/*!
 SmoothPage loads pages, a single-page application implementation. 
 Based on SmoothState.js. It uses jquery slim, fetch, loosely coupled and does not load the app shell DOM, only content.
 It requires jquery and js-Signals. In ie it requiers fetch
*/

/*ex pg use:
	function init() {
	}
	loadjs.ready(['ready'], {// loaded setup libs
		success: function(){
			init()
		}
	})
*/
/* ex main.js:
	loadjs.done('ready') // page ready for above
	SP.ScontentID ='#content-wrapper'
	SP.smoothPg.add(function(typ, $new, delta, $html) {

		if(SP.PRE==typ)  {//start
			console.log($new)
			//$('#content-wrapper').fadeTo(100,.2)

		}
		if(SP.PAGE==typ)  {//ready
			$(SP.ScontentID).html($new)
			//$('#content-wrapper').fadeTo(100,1)

		}//fi

	})// add signal
*/

'use strict'

//setup page events /////////////////////////
$(document).ready(function () {
	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			SP.loadPg(state.url)
		}
	})//()

	$(document).on('click', 'a', function (e) {
		var $this = $(this)
		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')
		//console.log(href)
		if(SP.isExternal(href)) {
			console.log('bye')
			return
		}
		if(!SP._shouldLoadAnchor(href)) {
			console.log('#')
			return
		}
		console.log('doing SP:')
		e.stopPropagation()
		e.preventDefault()
		SP._clickAnchor(href, $this.title)
	})//()
	console.log('SP ready 05')
})

///////////////////////////////////////////////////////
var SP = { //class:
	
ScontentID: '#myContentId' //the content in your layout. The rest should be app shell from PWA.
,_setupStarted: new Date().getTime()
,smoothPg: new signals.Signal()	
,inAction : false // set to true when user acts; false when effect is done
,PRE : '_pre-action'
,PAGE : '_new-page'
,_actStarted : new Date().getTime()
,startAct: function (newUrl) {
	SP.inAction = true
	SP._actStarted = new Date().getTime()
	SP.smoothPg.dispatch(SP.PRE, newUrl)
}//()
,actReady: function ($newContent, $html) {
	var delta = new Date().getTime() - SP._actStarted
	SP.smoothPg.dispatch(SP.PAGE, $newContent, delta, $html)
	SP.inAction=false

}//()

,loadPg: function(pg) {//triggered, but funtion can be called directly also
	SP.startAct(pg)
	//pg = location.protocol + '//' + location.host + pg
	console.log(pg)
	fetch(pg, {
			method: 'get'
		}).then(function(reSPonse) {
			if (!reSPonse.ok) {
				console.log('not ok')
				console.log(reSPonse)
				throw Error(reSPonse.statusText)
			}
			return reSPonse.text()
		}).then(function(txt) {
			var $html = $( '<html></html>' ).append( $(txt) )
			var title = $html.find('title').first().text()
			document.title = title

			var div = $html.find(SP.ScontentID).html()

			SP.actReady(div, $html)

		}).catch(function(err) {
			console.log(err)
			SP.smoothPg.dispatch('ERROR',err)
	})//fetch

}//()

,_lastState: {} // maybe used to check '_isSameOrHash'
,_clickAnchor : function(href, title) {
	SP._lastState =  {
		url : href
		,title : title
	}

	history.pushState( SP._lastState, title, href)//title will not be used
	SP.loadPg(href)
}//()

,isExternal: function(url) {// copied from original SS
	var match = url.match(/^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/)
	if (typeof match[1] === 'string' && match[1].length > 0 && match[1].toLowerCase() !== window.location.protocol) {
		return true
	}
	if (typeof match[2] === 'string' &&
		match[2].length > 0 &&
		match[2].replace(new RegExp(':(' + {'http:': 80, 'https:': 443}[window.location.protocol] +
		')?$'), '') !== window.location.host) {
		return true
	}
	return false
}//()
,stripHash: function(href) {// copied from original SS
	if(undefined === href) return undefined
	return href.replace(/#.*/, '')
}
// see original SS shouldLoadAnchor:
,_shouldLoadAnchor: function (href) {// is it differentOrHash
	var hasHash =  href.indexOf('#') > -1
	if(hasHash) return false// has hash
	var cur = SP.stripHash(SP._lastState.url)
	var noHash =  SP.stripHash(href)
	console.log(cur, noHash)
	if(cur == noHash) {
		return false
	}

	return true // no hash and is different url
}

}//class
