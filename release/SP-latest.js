// http://rawgit.com
// http://zinoui.com/demo/pushstate

'use strict'

//setup page events /////////////////////////
$(document).ready(function () {

	SP.clearUrl()

	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			SP.loadPg(state.url)
		}
	})//()

	$(document).on('click', 'a', function (e) {//prevent
		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')
		//console.log(href)
		if(! href || href.length < 1) {
			return
		}
		if(SP.isHash(href)) {
			SP.clearUrl()
			console.log('#')
			return
		}
		if(SP.isExternal(href)) {
			console.log('bye')
			return
		}

		//e.stopPropagation()
		e.preventDefault()
		SP._clickAnchor(href)
	})//()
	console.log('SP ready')
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
	SP.startAct(SP.stripHash(pg))//maybe just #sidedrawer
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

,_lastState: {} // maybe used 
,_clickAnchor : function(href) {
	SP._lastState =  {
		url : href
	}

	history.pushState( SP._lastState, '', SP.stripHash(href))//title will not be used, it is loaded in loadPg()
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
,stripHash: function(href) {
	if(undefined === href) return undefined
	return href.replace(/#.*/, '')
}
,isHash: function (href) {//maybe only #sidedrawer
	return href.indexOf('#') > -1
}

,clearUrl:function () {// ?
	var url = location.pathname
	var h = SP.stripHash(url) //maybe only #sidedrawer
	console.log(h)
	window.location.hash = ''
	history.replaceState(SP._lastState, document.title, h)
}
}//class

window.addEventListener('pageshow', function(event) {
	console.log('pageshow:', event.timeStamp)
})