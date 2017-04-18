
// example use:
SP.ScontentID ='#ss'
SP.smoothPg.add(function(typ, $new, delta, $html) {
	console.log(typ)
	if(SP.PRE==typ)  {//start
		console.log($new)
	}
	if(SP.PAGE==typ)  {//ready
		$(SP.ScontentID).html($new)
	}
})
SP.setupDone()