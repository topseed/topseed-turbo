// http://rawgit.com
// http://zinoui.com/demo/pushstate

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

	SP.clearUrl()

	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			SP.loadPg(state.url)
		}
	})//()

	$('head').append('<style type="text/css">#sidedrawer:target {transform: translateX(0px)}</style></style>')
	$('#sidedrawer:target').css('transform', 'translateX(0px)')//clear css style
	$(document).on('click', 'a', function (e) {
		$('#sidedrawer:target').css('transform', 'translateX(0px)')//clear css style
		$('head').append('<style type="text/css">#sidedrawer:target {transform: translateX(201px)}</style></style>')

		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')
		//console.log(href)
		if(SP.isExternal(href)) {
			console.log('bye')
			return
		}
		if(!SP._shouldLoadAnchor(href)) {
			SP.clearUrl()
			console.log('#')
			return
		}

		console.log('doing SP:')
		//e.stopPropagation()
		e.preventDefault()
		SP._clickAnchor(href)
	})//()
	console.log('SP ready 1.15')
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
,clearUrl:function () {
	var url = location.pathname
	var h = SP.stripHash(url) //maybe only #sidedrawer
	console.log(h)
	//window.location.hash = ''
	history.replaceState(SP._lastState, document.title, h)
}
}//class

window.addEventListener('pageshow', function(event) {
	console.log('pageshow:', event.timeStamp)
})