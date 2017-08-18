'use strict'

var TR = {

	processing: false
	, preprocessing: false

	, show: function (cont, evt){
		$(cont).html(evt.$new)
	}

	, _clone: function($parent, $newParent, wrapperId){

		var $clone = $parent.children().clone()
		$clone.find().remove('script')//we're animating display version only
		$newParent.append($clone)
		var wrapper = $(document.createElement('div')).attr('id', wrapperId).attr('class', wrapperId)
		$clone.wrapAll(wrapper)
	}

	, _clip: function(wrapperId, right, bottom, left, top){
		var frame = 'rect('+(left||'0px')+' '+right+' '+bottom+' '+(top||'0px')+')'
		var clip = $('#'+wrapperId)
		clip.css('clip', frame) // clip it
		clip.css('position','absolute')
		clip.css('z-index', 8)
		clip.css('top', '0px')
		clip.css('left', '0px')
		clip.css('width', $(window).width()+'px') 
		clip.css('min-height', $(window).height()+'px') 
		return clip
	}

	, uncoverDown: function(cont, contb, evt, duration){
		TR._uncover(cont, contb, evt, duration, 'down')
	}

	, uncoverUp: function(cont, contb, evt, duration){
		TR._uncover(cont, contb, evt, duration, 'up')
	}

	, uncoverLeft: function(cont, contb, evt, duration){
		TR._uncover(cont, contb, evt, duration, 'left')
	}

	, uncoverRight: function(cont, contb, evt, duration){
		TR._uncover(cont, contb, evt, duration, 'right')
	}

	, _uncover: function(cont, contb, evt, duration, direction){
		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)
		var $contb = $(contb) //(cont, 'unc')

		if (evt.fromHref == evt.toHref) {	
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing = false
			return
		}
		
		TR._clone($cont, $contb, 'firstSl')

		var wi = $(window).width()+'px'
		var he = $(window).height()+'px'

		var $clip = TR._clip('firstSl', wi, he)
		$clip.css('background-color','white')

		$cont.html(evt.$new)

		switch (direction){
			case 'down': $clip.transition({y: he, easing: 'easeOutCubic', duration: duration}); break
			case 'up': $clip.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration}); break
			case 'right': $clip.transition({x: wi, easing: 'easeOutCubic', duration: duration}); break
			case 'left': $clip.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration}); break
		}

		setTimeout(function(){ 
			$contb.empty() //$contb.remove()
			TR.processing = false
		}, duration) //cleanup
	}

	, coverDown: function(cont, contb, evt, duration){
		TR._cover(cont, contb, evt, duration, 'down')
	}

	, coverUp: function(cont, contb, evt, duration){
		TR._cover(cont, contb, evt, duration, 'up')
	}

	, coverLeft: function(cont, contb, evt, duration){
		TR._cover(cont, contb, evt, duration, 'left')
	}

	, coverRight: function(cont, contb, evt, duration){
		TR._cover(cont, contb, evt, duration, 'right')
	}

	, _cover: function(cont, contb, evt, duration, direction){
		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)
		var $contb = $(contb) //(cont, 'cover')

		if (evt.fromHref == evt.toHref) {	
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing = false
			return
		}
		
		TR._clone($cont, $contb, 'firstSl')

		var wi = $(window).width()+'px'
		var he = $(window).height()+'px'

		var $clip = TR._clip('firstSl', wi, he)
		//$clip.css('background-color','white')

		$cont.css('position', 'absolute')
		switch (direction){
			case 'down': $cont.css('top', '-'+he); $cont.css('left', '0px'); break
			case 'up': $cont.css('top', he); $cont.css('left', '0px'); break
			case 'right': $cont.css('top', '0px'); $cont.css('left', wi); break
			case 'left': $cont.css('top', '0px'); $cont.css('left', '-'+wi); break
		}
		$cont.css('z-index', '9')
		$cont.css('transform', '') //clear old transforms

		$cont.html(evt.$new)

		switch (direction){
			case 'down': $cont.transition({y: he, easing: 'easeOutCubic', duration: duration}); break
			case 'up': $cont.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration}); break
			case 'right': $cont.transition({x: wi, easing: 'easeOutCubic', duration: duration}); break
			case 'left': $cont.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration}); break
		}

		setTimeout(function(){ 
			//$contb.empty() 
			$contb.remove()
			TR.processing = false
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

	, boxOut: function(cont, contb, evt, duration, _scale){
		if (TR.preprocessing) return
		TR.preprocessing = true

		setTimeout(function(){
		
			var $cont = $(cont)
			var $contb = $(contb) //(cont, 'bo')

			var nwi = $(window).width()
			var nhe  = $(window).height()
			TR._clone($cont, $contb, 'firstSl')

			var $clip = TR._clip('firstSl', nwi+'px', (nhe-50.4)+'px', '50.4px')
			$clip.css('background-color','white')

			$cont.empty() 

			$clip.transition({scale: _scale}, duration, 'easeOutCubic')
			setTimeout(function(){ 
				$contb.empty() //$contb.remove()
				TR.preprocessing = false
			}, duration) //cleanup
		}, 0)
	}

	, _insertPeer: function(cont, uniqueSuffix) {
		var contb = cont+'-'+uniqueSuffix
		var sibling = $(document.createElement('div')).attr('id', contb)
		$(cont).before(sibling)
		var $contb = $(contb)
		$contb.css('position','absolute')
		$contb.css('top','0px')
		$contb.css('left','0px')
		return $contb
	}

	, splitVerticalOut: function(cont, contb, evt, duration) {

		if (TR.processing) return
		TR.processing = true

		var $cont = $(cont)
		var $contb = $(contb) //(cont, 'svo')
		
		// compute endpoints math to split screen
		var nwi = $(window).width()
		var wi = nwi+'px'
		var hwi = (nwi / 2) + 'px'
		var he  = $(window).height() + 'px'

		var leftRect = 'rect(0px '+hwi+' '+he+' 0px)'
		var rightRect = 'rect(0px '+wi+' '+he+' '+hwi + ')'
		
		TR._clone($cont, $contb, 'firstSl')
		TR._clone($cont, $contb, 'cloneSl')

		$cont.html(evt.$new)

		// =============================================================
		//css clip computed
		var leftClip = $('#firstSl')
		leftClip.css('clip', leftRect) // clip it
		leftClip.css('position','absolute')
		leftClip.css('z-index', 8)
		leftClip.css('top', '0px')
		leftClip.css('left', '0px')
		leftClip.css('width', wi)
		leftClip.css('min-height', he)
		leftClip.css('background-color','white')
		leftClip.css('transform', '')
		
		var rightClip = $('#cloneSl')
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
			$contb.empty() //$contb.remove()
			TR.processing = false
		}, duration)
	}
}
