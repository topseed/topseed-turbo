
// test
sP.smoothPg.add(function(typ, $new, delta, $html) {
	console.log(typ)
	if(sP.PRE==typ)  {//start
		console.log($new)
	}
	if(sP.PAGE==typ)  {//ready
		$(sP.ScontentID).html($new)
	}
})
sP.setupDone()