/*!
 jquery.ss.js loads pages, a single-page application implementation. 
 Based on SmoothState.js.
 It requires jquery and js-Singals.
*/
'use strict'

var $Scontent = $('#ss') //the content

//setup events /////////////////////////
$(document).ready(function () {

	$(window).on('popstate', function (e) {
		//e.preventDefault()
		console.log(e)
		var state = e.originalEvent.state;
		console.log(state)
		if (state !== null) {
			//document.title = state.title
		}//fi
	})

	$(document).on('click', 'a', function (e) {
		//e.preventDefault()

		var $this = $(this)
		var url = $this.attr('href')
		var title = $this.text()
		console.log(url, title)

		console.log(document.location.pathname)
		console.log(e.target.hostname)
		console.log(e.target.origin)

		console.log(e.target.baseURI)
		history.pushState({ url: url, title: title }, title, url)

	})

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
}//class
var ss = new SS()
