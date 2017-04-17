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
		var url = $this.attr('href')
		console.log(url, 1)
		if(SP.isExternal(url)) {
			console.log('bye')
			return
		}
		if(SP.isHash(url)) {
			console.log('#')
			return
		}
		console.log('SP')
		//e.stopPropagation()
		e.preventDefault()
		SP._Aclicked($this, e.target)
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
	SP.startAct(pg)
	pg = location.protocol + '//' + location.host + pg
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

,_Aclicked: function($this) {
	var url = $this.attr('href')
	var title = $this.text()

	history.pushState({ url: url }, title, url)//title will not be used
	SP.loadPg(url)
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

/**
 * Strips the hash from a url and returns the new href
 * @param   {string}    href - url being evaluated
 */
,stripHash: function(href) {
return href.replace(/#.*/, '')
}
/**
 * Checks to see if the url is an internal hash
 * @param   {string}    href - url being evaluated
 * @param   {string}    prev - previous url (optional)
 */
,isHash: function (href, prev) {
prev = prev || window.location.href
var hasHash = (href.indexOf('#') > -1) ? true : false,
	samePath = (utility.stripHash(href) === utility.stripHash(prev)) ? true : false
return (hasHash && samePath)
}
 /** Forces browser to redraw n */
,redraw: function () {
	$('<style></style>').appendTo($(document.body)).remove()
	$(document.body).height()
}
}//class