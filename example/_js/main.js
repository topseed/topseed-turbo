
// example use:
TT.ScontentID ='#ss'
TT.smoothPg.add(function(type, $new, delta, $html) {
	console.log(type)
	if (TT.PRE==type)  {//start
		console.log($new)
	}
	if (TT.PAGE==type)  {//ready
		$(TT.ScontentID).html($new)
	}
})
TT.setupDone()