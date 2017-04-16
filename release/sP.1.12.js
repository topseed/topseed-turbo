// https://rawgit.com/

/*!
 jquery.sP.js loads pages, a single-page application implementation. 
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
/* ex setup

	loadjs.done('ready') // page ready
	sP.ScontentID ='#content-wrapper'
	sP.smoothPg.add(function(typ, $new, delta, $html) {
		console.log(typ)

		if(sP.PRE==typ)  {//start
			console.log($new)
			//$('#content-wrapper').fadeTo(100,.2)

		}
		if(sP.PAGE==typ)  {//ready
			$(sP.ScontentID).html($new)
			//$('#content-wrapper').fadeTo(100,1)

		}

	})
*/

'use strict'

//setup page events /////////////////////////
$(document).ready(function () {
	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		if (state !== null) {
			e.preventDefault()
			sP.loadPg(state.url)
		}
	})//()

	$(document).on('click', 'a', function (e) {
		var $this = $(this)
		var url = $this.attr('href')
		if(sP.isExternal(url)) {
			console.log('bye')
			return
		}

		e.stopPropagation()
		e.preventDefault()
		sP._Aclicked($this, e.target)
	})//()
	console.log('ss 1.12 ready')
})

///////////////////////////////////////////////////////
var sP = { //class:
	
ScontentID: '#myContentId' //the content in your layout. The rest should be app shell from PWA.
,_setupStarted: new Date().getTime()
,smoothPg: new signals.Signal()	
,inAction : false // set to true when user acts; false when effect is done
,PRE : '_pre-action'
,PAGE : '_new-page'
,_actStarted : new Date().getTime()
,startAct: function (newUrl) {
	sP.inAction = true
	sP._actStarted = new Date().getTime()
	sP.smoothPg.dispatch(sP.PRE, newUrl)
}//()
,actReady: function ($newContent, $html) {
	var delta = new Date().getTime() - sP._actStarted
	sP.smoothPg.dispatch(sP.PAGE, $newContent, delta, $html)
	sP.inAction=false

}//()

,loadPg: function(pg) {//triggered, but funtion can be called
	sP.startAct(pg)
	pg = location.protocol + '//' + location.host + pg
	//console.log(pg)
	fetch(pg, {
			method: 'get'
		}).then(function(response) {
			if (!response.ok) {
				console.log('not ok')
				console.log(response)
				throw Error(response.statusText)
			}
			return response.text()
		}).then(function(txt) {
			var $html = $( '<html></html>' ).append( $(txt) )
			var title = $html.find('title').first().text()
			document.title = title

			var div = $html.find(sP.ScontentID).html()

			//console.log(div)
			sP.actReady(div, $html)

		}).catch(function(err) {
			console.log(err)
			sP.smoothPg.dispatch('ERROR',err)
	})//fetch

}//()

,_Aclicked: function($this) {
	var url = $this.attr('href')
	var title = $this.text()

	history.pushState({ url: url }, title, url)//title will not be used
	sP.loadPg(url)
}//()

,isExternal: function(url) { // copied from original SS
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

}//class
