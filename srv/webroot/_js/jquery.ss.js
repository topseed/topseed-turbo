/*!
 jquery.ss.js loads pages, a single-page application implementation. 
 Based on SmoothState.js. It uses jquery slim, fetch, loosely coupled and does not load the app shell DOM, only content.
 It requires jquery and js-Signals.
*/
'use strict'

var ScontentID = '#ss' //the content

var pgState = new signals.Signal()

//setup page events /////////////////////////
$(document).ready(function () {
	$(window).on('popstate', function (e) {		
		//e.preventDefault()
		var state = e.originalEvent.state
		ss._statedPoped(state)
	})//()
	$(document).on('click', 'a', function (e) {
		var $this = $(this)
		var url = $this.attr('href')
		console.log(ss.isExternal(url))
		//e.stopPropagation()
		//e.preventDefault()

		ss._Aclicked($this, e.target)
	})//()
	console.log('ss ready')
})

///////////////////////////////////////////////////////
class SS {
load(pg, title) {
	pg = location.protocol + '//' + location.host + pg
	console.log(pg, title)
	document.title = title
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
			console.log(txt)
			var $html = $.parseHTML( txt )
			
		})

}//()

clear(id) {
	console.log(id)
}

_statedPoped(state) {
	console.log(state)
	if (state !== null) {
		this.load(state.url, state.title)
	}//fi
}

_Aclicked($this, target) {
	var url = $this.attr('href')
	var title = $this.text()

	history.pushState({ url: url, title: title }, title, url)
	this.load(url, title)
}//()

isExternal(url) { // from original SS
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
var ss = new SS()
