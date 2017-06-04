
// example use:
TT.ScontentID ='#ss'
TT.handle(function(evt) {
	if(TT.PRE==evt.typ)  {//start
		console.log(evt.$new)
		//$('#content-wrapper').fadeTo(100,.2)
	}
	if(TT.PAGE==evt.typ)  {//new pg loaded
		$(TT.ScontentID).html(evt.$new)
		//$('#content-wrapper').fadeTo(100,1)
	}
})