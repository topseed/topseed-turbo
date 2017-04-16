/*!
 jquery.sP.js loads pages, a single-page application implementation. 
 Based on SmoothState.js. It uses jquery slim, fetch, loosely coupled and does not load the app shell DOM, only content.
 It requires jquery and js-Signals. In ie it requiers fetch
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
	console.log('ss ready')
})

///////////////////////////////////////////////////////
var sP = { 
	
ScontentID: '#ss' //the content in your layout. The rest should be app shell from PWA.
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

,_setupDone : false
,onSetup: function(cb) { // on loading libs complete, call from pg
	if(sP._setupDone) {
		cb()
	} //fi
	else {
		sP.smoothPg.addOnce(function() {
			cb()
			return false
	})//added once
	}//else
}//()
,setupDone:function() {// indicate that libs have loaded and pages can run
	var delta = new Date().getTime() - sP._setupStarted
	sP.smoothPg.dispatch('setupDone', delta)
	sP._setupDone = true
}

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

			var div = $html.find(sP.ScontentID)
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
