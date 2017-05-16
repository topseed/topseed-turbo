/* ex use: 
TT.ScontentID ='#content-wrapper'
TT.handle(function(evt) {
	if(TT.PRE==evt.typ)  {//start
		console.log(evt.$new)
		//$('#content-wrapper').fadeTo(100,.2)
	}
	if(TT.PAGE==evt.typ)  {//new pg loaded
		$(TT.ScontentID).html(evt.$new)
		//$('#content-wrapper').fadeTo(100,1)

	}
})
*/

'use strict'
//setup page events /////////////////////////
$(document).ready(function () {

	TT.clearUrl()

	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			TT.loadPg(state.url)
		}
	})//()

	$(document).on('click', 'a', function (e) {//prevent
		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')
		//console.log(href)
		if(! href || href.length < 1) {
			return
		}
		if(TT.isHash(href)) {
			TT.clearUrl()
			console.log('#')
			return
		}
		if(TT.isExternal(href)) {
			console.log('bye')
			return
		}

		//e.stopPropagation()
		e.preventDefault()
		TT._clickAnchor(href)
	})//()
	console.log('TT loaded')
})
////////////////////////////////
var TTObj = {
  typ: null
, $new: null
, delta: null
, $html: null
, err: null
}

///////////////////////////////////////////////////////
var TT = { //class:
	
ScontentID: '#myContentId' //the content in your layout. The rest should be app shell from PWA.
, _setupStarted: new Date().getTime()
, smoothPg: flyd.stream()
, handle : function(foo) {
	flyd.on(foo, TT.smoothPg)
}//()
, inAction : false // set to true when user acts; false when effect is done
, PRE : '_pre-action'
, PAGE : '_new-page'
, _actStarted : new Date().getTime()
, startAct: function (newUrl) {
	TT.inAction = true
	TT._actStarted = new Date().getTime()
	TT.smoothPg({typ:TT.PRE, $new:newUrl})
}//()
, actReady: function ($newContent, $html) {
	var delta = new Date().getTime() - TT._actStarted
	TT.smoothPg({typ:TT.PAGE, $new:$newContent, delta:delta, $html:$html})
	TT.inAction=false

}//()

, loadPg: function(pg) {//triggered, but funtion can be called directly also
	history.pushState({}, '', pg) //NEW

	TT.startAct(TT.stripHash(pg))//maybe just #sidedrawer
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

			var div = $html.find(TT.ScontentID).html()

			TT.actReady(div, $html)

		}).catch(function(er) {
			console.log(er)
			TT.smoothPg({err:er})
	})//fetch

}//()

, _lastState: {} // maybe used 
, _clickAnchor : function(href) {
	TT._lastState =  {
		url : href
	}

	history.pushState( TT._lastState, '', TT.stripHash(href))//title will not be used, it is loaded in loadPg()
	TT.loadPg(href)
}//()

, isExternal: function(url) {// copied from original SS
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
, stripHash: function(href) {
	if(undefined === href) return undefined
	return href.replace(/#.*/, '')
}
, isHash: function (href) {//maybe only #sidedrawer
	return href.indexOf('#') > -1
}

, clearUrl:function () {// ?
	var url = location.pathname
	var h = TT.stripHash(url) //maybe only #sidedrawer
	console.log(h)
	window.location.hash = ''
	history.replaceState(TT._lastState, document.title, h)
}
}//class

window.addEventListener('pageshow', function(event) {
	console.log('pageshow:', event.timeStamp)
})