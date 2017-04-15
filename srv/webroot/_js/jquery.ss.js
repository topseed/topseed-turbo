/*!
 jquery.ss.js loads pages, a single-page application implementation. 
 Based on SmoothState.js.
 It requires jquery and js-Singals.
*/

console.log('ss')
$(document).ready(function () {
	$('a').click(function (e) {
		console.log(e)
		console.log(e.target.tagName)

		console.log(e.target.baseURI)
		console.log(e.target.href)

		e.preventDefault();
		e.stopPropagation();
	})
})

class SS {
load(pg) {
	console.log(pg)
}//()
clear(id) {
	console.log(id)
}
}//class
var ss = new SS()


