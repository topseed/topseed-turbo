/* ex use: 
TT.ScontentID ='#content-wrapper'
TT.handle(function(evt) {
	if(TT.PRE==evt.typ)  {//start
		console.log(evt.$new)
		//$('#content-wrapper').fadeTo(100,.2)
	}
	if(TT.PAGE==evt.typ)  {//new page loaded
		$(TT.ScontentID).html(evt.$new)
		//$('#content-wrapper').fadeTo(100,1)
	}
})
*/

// http://zinoui.com/demo/pushstate

'use strict'
//setup page events /////////////////////////
$(document).ready(function () {
	console.log('$')

	$(window).on('popstate', function (e) {//back button
		var state = e.originalEvent.state
		console.log('state', state)
		if (state !== null) {
			e.preventDefault()
			var oldUrl = window.document.referrer
			console.log('back to(state.url)'+(state.url)+' from:'+oldUrl)
			TT.loadPg(state.url, oldUrl, true)
		}
	})//()

	$(document).on('click', 'a', function (e) {//prevent
		var $anchor = $(e.currentTarget)
		var href = $anchor.prop('href')

		if (! href || href.length < 1) {
			return
		}

		if (TT.isExternal(href)) {
			console.log('bye')
			return
		}

		if (href.indexOf('#')>-1) {
			//console.log('ignore link with #')
			return
		}

		e.preventDefault()
		var fromHref = window.location.href
		TT.loadPg(href, fromHref)
	})//()

	var pg = window.location.href
	console.log(pg)
	history.pushState({url: pg}, '', pg) 

	console.log('TT loaded')
})
////////////////////////////////
var TTObj = {
	typ: null
	, $new: null
	, delta: null
	, $html: null
	, err: null
	, fromHref: null
	, toHref: null
	, back: null
}


var TT = { 
	
	ScontentID: '#myContentId' //the content in your layout. The rest should be app shell from PWA.
	, inAction : false // set to true when user acts; false when effect is done
	, PRE : '_pre-action'
	, PAGE : '_new-page'
	, _setupStarted: new Date().getTime()
	, _actStarted : new Date().getTime()
	, smoothPg: flyd.stream()

	, handle : function(foo) {
		flyd.on(foo, TT.smoothPg)
	}

	, startAct: function (toHref, fromHref, back) {
		TT.inAction = true
		TT._actStarted = new Date().getTime()
		TT.smoothPg({typ:TT.PRE, toHref:toHref, fromHref:fromHref, $new:toHref, back:back}) //$new is for backward compatibility
	}//()

	, actReady: function ($newContent, $html, toHref, fromHref, back) {
		var delta = new Date().getTime() - TT._actStarted
		TT.smoothPg({typ:TT.PAGE, toHref:toHref, fromHref:fromHref, $new:$newContent, delta:delta, $html:$html, back:back})
		TT.inAction=false
	}//()

	, push: function() {
		var st= $(location).attr('href')
	}

	, loadPg: function(toHref, fromHref, back) {//triggered, but funtion can be called directly also
		console.log('loaded', toHref, back)
		if (!back) {
			history.pushState({url: toHref}, '', toHref) 
			//console.log('pushed', toHref)
		}

		TT.startAct(toHref, fromHref, back)//maybe just #sidedrawer
		var x =  TT.appendQueryString(toHref,{'TT': "\""+TT.ScontentID+"\""} )
		console.log(x)
		fetch(x, {
				method: 'get'
			}).then(function(reSPonse) {
				if (!reSPonse.ok) {
					console.log('not ok')
					console.log(reSPonse)
					throw Error(reSPonse.statusText)
				}
				return reSPonse.text()
			}).then(function(txt) {
				var $html = $( '<html></html>' ).append( $(txt) )
				var title = $html.find('title').first().text()
				document.title = title

				var div = $html.find(TT.ScontentID).html()

				TT.actReady(div, $html, toHref, fromHref, back)

			}).catch(function(er) {
				console.log(er)
				TT.smoothPg({err:er})
		})//fetch

	}//()

	, isExternal: function(url) {// copied from original SS
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

	,appendQueryString:function (url, queryVars) {
		var firstSeparator = (url.indexOf('?')==-1 ? '?' : '&');
		var queryStringParts = new Array();
		for(var key in queryVars) {
			queryStringParts.push(key + '=' + queryVars[key]);
		}
		var queryString = queryStringParts.join('&');
		return url + firstSeparator + queryString;
	}

}//class

window.addEventListener('pageshow', function(event) {
	console.log('pageshow:', event.timeStamp)
})