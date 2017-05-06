
// example use:
SP.ScontentID ='#ss'
SP.smoothPg.add(function(type, $new, delta, $html) {
	console.log(type)
	if (SP.PRE==type)  {//start
		console.log($new)
	}
	if (SP.PAGE==type)  {//ready
		$(SP.ScontentID).html($new)
	}
})
SP.setupDone()