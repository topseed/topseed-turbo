// http://zinoui.com/demo/pushstate

'use strict'

//setup page events /////////////////////////
$(document).ready(function () {

	SC.clearUrl()

	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			SC.loadPg(state.url)
		}
	})//()

	$(document).on('click', 'a', function (e) {//prevent
		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')
		//console.log(href)
		if(! href || href.length < 1) {
			return
		}
		if(SC.isHash(href)) {
			SC.clearUrl()
			console.log('#')
			return
		}
		if(SC.isExternal(href)) {
			console.log('bye')
			return
		}

		//e.stopPropagation()
		e.preventDefault()
		SC._clickAnchor(href)
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
	SC.inAction = true
	SC._actStarted = new Date().getTime()
	SC.smoothPg.dispatch(SC.PRE, newUrl)
}//()
,actReady: function ($newContent, $html) {
	var delta = new Date().getTime() - SC._actStarted
	SC.smoothPg.dispatch(SC.PAGE, $newContent, delta, $html)
	SC.inAction=false

}//()

,loadPg: function(pg) {//triggered, but funtion can be called directly also
	SC.startAct(SC.stripHash(pg))//maybe just #sidedrawer
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

			var div = $html.find(SC.ScontentID).html()

			SC.actReady(div, $html)

		}).catch(function(err) {
			console.log(err)
			SC.smoothPg.dispatch('ERROR',err)
	})//fetch

}//()

,_lastState: {} // maybe used 
,_clickAnchor : function(href) {
	SC._lastState =  {
		url : href
	}

	history.pushState( SC._lastState, '', SC.stripHash(href))//title will not be used, it is loaded in loadPg()
	SC.loadPg(href)
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
	var h = SC.stripHash(url) //maybe only #sidedrawer
	console.log(h)
	window.location.hash = ''
	history.replaceState(SC._lastState, document.title, h)
}
}//class

window.addEventListener('pageshow', function(event) {
	console.log('pageshow:', event.timeStamp)
})