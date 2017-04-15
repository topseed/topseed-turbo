/*!
 jquery.ss.js loads pages, a single-page application implementation. 
 Based on SmoothState.js.
 It requires jquery and js-Singals.
*/

//setup events /////////////////////////
$(document).ready(function () {
	console.log('ss')

	$(window).on('popstate', function (e) {
		//e.preventDefault()
		console.log('aa')

		console.log(e)

	})

	$(document).on('click', 'a', function (e) {
		//e.preventDefault()
		console.log(e.target.tagName)

		console.log(document.location.pathname)
		console.log(e.target.hostname)
		console.log(e.target.origin)

		console.log(e.target.baseURI)
		console.log(e.target.pathname)
		console.log(e.target.href)	
		history.pushState(null, "title 1", e.target.href)

	})

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


console.log('ah')