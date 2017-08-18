'use strict'

var TR = {

	processing: false
	, preprocessing: false

	, show: function (cont, evt){
		$(cont).html(evt.$new)
	}

	, _clone: function($parent, $newParent, wrapperIdSuffix){
		var $clone = $parent.children().clone()
		$clone.find().remove('script')//we're animating display version only
		$newParent.append($clone)
		var wrapperId = $parent.attr('id')+'-'+wrapperIdSuffix
		var wrapper = $(document.createElement('div')).attr('id', wrapperId).attr('class', wrapperId)
		$clone.wrapAll(wrapper)
	}

	, _clip: function($parent, suffix, right, bottom, left, top){
		var frame = 'rect('+(left||'0px')+' '+right+' '+bottom+' '+(top||'0px')+')'
		var clip = $('#'+$parent.attr('id')+'-'+suffix)
		clip.css('clip', frame) // clip it
		clip.css('position','absolute')
		clip.css('z-index', 8)
		clip.css('top', '0px')
		clip.css('left', '0px')
		clip.css('width', $(window).width()+'px') 
		clip.css('min-height', $(window).height()+'px') 
		return clip
	}

	, uncoverDown: function(cont, evt, duration){

		TR._uncover(cont, evt, duration, 'down')
	}

	, uncoverUp: function(cont, evt, duration){
		TR._uncover(cont, evt, duration, 'up')
	}

	, uncoverLeft: function(cont, evt, duration){
		TR._uncover(cont, evt, duration, 'left')
	}

	, uncoverRight: function(cont, evt, duration){
		TR._uncover(cont, evt, duration, 'right')
	}

	, _uncover: function(cont, evt, duration, direction){

		console.log('uncover.processing'+TR.processing)

		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)

		if (evt.fromHref == evt.toHref) {
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing = false
			console.log('to is same as from'+evt.fromHref)
			return
		}

		var $contb = TR._insertPeer(cont, 'unc')

		TR._clone($cont, $contb, 'unc__clone')

		var wi = $(window).width()+'px'
		var he = $(window).height()+'px'

		var $clip = TR._clip($cont, 'unc__clone', wi, he)
		$clip.css('background-color','white')

		$cont.html(evt.$new)

		switch (direction){
			case 'down': $clip.transition({y: he, easing: 'easeOutCubic', duration: duration}); break
			case 'up': $clip.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration}); break
			case 'right': $clip.transition({x: wi, easing: 'easeOutCubic', duration: duration}); break
			case 'left': $clip.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration}); break
		}

		setTimeout(function(){ 
			TR.processing = false
			$contb.remove() 
		}, duration) //cleanup
	}

	, coverDown: function(cont, evt, duration){
		TR._cover(cont, evt, duration, 'down')
	}

	, coverUp: function(cont, evt, duration){
		TR._cover(cont, evt, duration, 'up')
	}

	, coverLeft: function(cont, evt, duration){
		TR._cover(cont, evt, duration, 'left')
	}

	, coverRight: function(cont, evt, duration){
		TR._cover(cont, evt, duration, 'right')
	}

	, _cover: function(cont, evt, duration, direction){
		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)
		var $contb = TR._insertPeer(cont, 'cover')

		if (evt.fromHref == evt.toHref) {	
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing = false
			return
		}
		
		TR._clone($cont, $contb, 'cover__cl')

		var wi = $(window).width()+'px'
		var he = $(window).height()+'px'

		var $clip = TR._clip($cont, 'cover__cl', wi, he)
		//$clip.css('background-color','white')

		$cont.css('position', 'absolute')
		switch (direction){
			case 'down': $cont.css('top', '-'+he); $cont.css('left', '0px'); break
			case 'up': $cont.css('top', he); $cont.css('left', '0px'); break
			case 'right': $cont.css('top', '0px'); $cont.css('left', wi); break
			case 'left': $cont.css('top', '0px'); $cont.css('left', '-'+wi); break
		}
		$cont.css('z-index', '10')
		$cont.css('transform', '') //clear old transforms
		$cont.css('opacity', '1')

		$cont.html(evt.$new)

		switch (direction){
			case 'down': $cont.transition({y: he, easing: 'easeOutCubic', duration: duration}); break
			case 'up': $cont.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration}); break
			case 'right': $cont.transition({x: wi, easing: 'easeOutCubic', duration: duration}); break
			case 'left': $cont.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration}); break
		}

		setTimeout(function(){ 
			TR.processing = false
			$contb.remove()
			$cont.css('z-index', '0') 
		}, duration) //cleanup
	}

	, fadeIn: function(cont, evt, duration){
		var $cont = $(cont)
		$cont.css('opacity', '0')
		$cont.html(evt.$new)
		$cont.transition({opacity: 1}, duration, 'easeOutCubic')
	}

	, fadeOut: function(cont, evt, duration, opacity){
		var $cont = $(cont)
		$cont.transition({opacity: opacity||.3}, duration, 'linear')
	}

	, boxOut: function(cont, evt, duration, _scale, topmargin, background_color){
		if (TR.preprocessing) return
		TR.preprocessing = true

		setTimeout(function(){
		
			var $cont = $(cont)

			if (evt.fromHref == evt.toHref) {	
				TR.preprocessing = false
				return
			}
			var $contb = TR._insertPeer(cont, 'bo')

			var nwi = $(window).width()
			var nhe  = $(window).height()
			TR._clone($cont, $contb, 'bo__cl')
			TR._clone($cont, $contb, 'bo__bg')

			var top = topmargin||0

			var $clip = TR._clip($cont, 'bo__cl', nwi+'px', (nhe-top)+'px', top+'px')
			$clip.css('background-color','white')
			$clip.css('z-index','-1')
			//ff shadow background
			var $bgclip = TR._clip($cont, 'bo__bg', nwi+'px', (nhe-top)+'px', top+'px')
			$bgclip.css('background-color', background_color||'black')
			$bgclip.css('z-index','-2')
			$bgclip.empty()

			$cont.empty()

			$clip.transition({scale: _scale}, duration, 'easeOutCubic')
			setTimeout(function(){ 
				$contb.remove()
				TR.preprocessing = false
			}, duration) //cleanup
		}, 0)
	}

	, _insertPeer: function(cont, uniqueSuffix) {
		var contb = cont+'-'+uniqueSuffix
		var id = cont.substring(1)+'-'+uniqueSuffix //remove leading #
		var sibling = $(document.createElement('div')).attr('id', id)
		$(cont).before(sibling)
		var $contb = $(contb)
		$contb.css('position','absolute')
		$contb.css('top','0x')
		$contb.css('left','0')
		return $contb
	}

	, splitVerticalOut: function(cont, evt, duration) {

		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)

		if (evt.fromHref == evt.toHref) {	
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing = false
			return
		}

		var $contb = TR._insertPeer(cont, 'svo')
		
		// compute endpoints math to split screen
		var nwi = $(window).width()
		var wi = nwi+'px'
		var hwi = (nwi / 2) + 'px'
		var he  = $(window).height() + 'px'

		var leftRect = 'rect(0px '+hwi+' '+he+' 0px)'
		var rightRect = 'rect(0px '+wi+' '+he+' '+hwi + ')'
		
		TR._clone($cont, $contb, 'svo__left')
		TR._clone($cont, $contb, 'svo__right')

		$cont.html(evt.$new)

		// =============================================================
		//css clip computed
		var leftClip = $(cont+'-svo__left')
		leftClip.css('clip', leftRect) // clip it
		leftClip.css('position','absolute')
		leftClip.css('z-index', 8)
		leftClip.css('top', '0px')
		leftClip.css('left', '0px')
		leftClip.css('width', wi)
		leftClip.css('min-height', he)
		leftClip.css('background-color','white')
		leftClip.css('transform', '')
		
		var rightClip = $(cont+'-svo__right')
		rightClip.css('clip', rightRect)
		rightClip.css('position','absolute')
		rightClip.css('z-index', 10)
		rightClip.css('top', '0px')
		rightClip.css('left', '0px')
		rightClip.css('width', wi)
		rightClip.css('min-height', he)
		rightClip.css('background-color','white')
		rightClip.css('transform', '')

		leftClip.transition({x: '-'+hwi, easing: 'easeOutCubic', duration: duration})
		rightClip.transition({x: hwi, easing: 'easeOutCubic', duration: duration})

		setTimeout(function(){ 
			$contb.remove()
			TR.processing = false
		}, duration)
	}
}
