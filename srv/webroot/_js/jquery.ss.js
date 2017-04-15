/*!
 jquery.ss.js loads pages, a single-page application implementation. 
 Based on SmoothState.js. It uses jquery slim, fetch, loosely coupled and does not load the app shell DOM, only content.
 It requires jquery and js-Signals.
*/
'use strict'

var $Scontent = $('#ss') //the content
//setup page events /////////////////////////
$(document).ready(function () {
	$(window).on('popstate', function (e) {		
		//e.preventDefault()
		var state = e.originalEvent.state
		ss._statedPoped(state)
	})//()
	$(document).on('click', 'a', function (e) {
		//e.preventDefault()
		var $this = $(this)
		ss._Aclicked($this, e.target)
	})//()
	console.log('ss ready')
})

///////////////////////////////////////////////////////
class SS {
load(pg) {
	console.log(pg)
}//()

clear(id) {
	console.log(id)
}

_statedPoped(state) {
	console.log(state)
	if (state !== null) {
		document.title = state.title
	}//fi
}

_Aclicked($this, target) {
	var url = $this.attr('href')
	var title = $this.text()
	console.log(url, title)

	console.log(target.hostname)
	console.log(target.origin)

	history.pushState({ url: url, title: title }, title, url)
	document.title = title;
}//()

}//class
var ss = new SS()
