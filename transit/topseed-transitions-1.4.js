'use strict'

$.fn.removeClassPrefix = function(prefix) {
	this.each(function(i, el) {
		var classes = el.className.split(" ").filter(function(c) {
			return c.lastIndexOf(prefix, 0) !== 0
		})
		el.className = $.trim(classes.join(" "))
	});
	return this
}

var TR = {

	processing: []

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

	, uncoverDown: function(cont, evt, duration, bgClass){
		return new Promise(function (resolve) {
			TR._uncover(cont, evt, duration, 'down', bgClass, resolve)
		})
	}

	, uncoverUp: function(cont, evt, duration, bgClass){
		return new Promise(function (resolve) {
			TR._uncover(cont, evt, duration, 'up', bgClass, resolve)
		})
	}

	, uncoverLeft: function(cont, evt, duration, bgClass){
		return new Promise(function (resolve) {
			TR._uncover(cont, evt, duration, 'left', bgClass, resolve)
		})
	}

	, uncoverRight: function(cont, evt, duration, bgClass){
		return new Promise(function (resolve) {
			TR._uncover(cont, evt, duration, 'right', bgClass, resolve)
		})
	}

	, _uncover: function(cont, evt, duration, direction, bgClass, resolve){
		var key = cont+'_uncover'
		if (TR.processing[key]) {resolve(); return}
		TR.processing[key] = true

		var $cont = $(cont)

		if (bgClass) {
			$cont.removeClassPrefix('page')
			$cont.addClass(bgClass)
		}

		if (evt.fromHref == evt.toHref) {
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing[key] = false
			resolve(); return
		}

		var $contb = TR._insertPeer(cont, 'unc')

		TR._clone($cont, $contb, 'unc__clone')

		var wi = $(window).width()+'px'
		var he = $(window).height()+'px'

		var $clip = TR._clip($cont, 'unc__clone', wi, he)
		$clip.css('background-color','white')

		$cont.html(evt.$new)

		return new Promise(function (tresolve) {
			switch (direction){
			case 'down': $clip.transition({y: he, easing: 'easeOutCubic', duration: duration, complete: tresolve}); break
			case 'up': $clip.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration, complete: tresolve}); break
			case 'right': $clip.transition({x: wi, easing: 'easeOutCubic', duration: duration, complete: tresolve}); break
			case 'left': $clip.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration, complete: tresolve}); break
			}
		}).then(function(){
			$contb.remove()
			$cont.css('z-index', '0') 
			TR.processing[key] = false
			resolve()
		})
	}

	, coverDown: function(cont, evt, duration, endPos, bgClass){
		return new Promise(function (resolve) {
			TR._cover(cont, evt, duration, 'down', endPos, bgClass, resolve)
		})
	}

	, coverUp: function(cont, evt, duration, endPos, bgClass){
		console.log('coverUp started'+new Date())
		return new Promise(function (resolve) {
			TR._cover(cont, evt, duration, 'up', endPos, bgClass, resolve)
		})
	}

	, coverLeft: function(cont, evt, duration, endPos, bgClass){
		return new Promise(function (resolve) {
			TR._cover(cont, evt, duration, 'left', endPos, bgClass, resolve)
		})
	}

	, coverRight: function(cont, evt, duratio, endPos, bgClass){
		return new Promise(function (resolve) {
			TR._cover(cont, evt, duration, 'right', endPos, bgClass, resolve)
		})
	}

	, _cover: function(cont, evt, duration, direction, endPos, bgClass, resolve){
		var key = cont+'_cover'
		if (TR.processing[key]) {resolve(); return}
		TR.processing[key] = true

		var $cont = $(cont)
		var $contb = TR._insertPeer(cont, 'cover')

		if (evt.fromHref == evt.toHref) {	
			$cont.html(evt.$new) //just refresh content, optional
			TR.processing[key] = false
			resolve(); return
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
		if (bgClass) {
			$cont.removeClassPrefix('page')
			$cont.addClass(bgClass)
		}

		$cont.html(evt.$new)


		return new Promise(function (tresolve) {
			switch (direction){
				case 'down': $cont.transition({y: he, easing: 'easeOutCubic', duration: duration, complete: tresolve }); break
				case 'up': $cont.transition({y: '-'+he, easing: 'easeOutCubic', duration: duration, complete: tresolve }); break
				case 'right': $cont.transition({x: wi, easing: 'easeOutCubic', duration: duration, complete: tresolve }); break
				case 'left': $cont.transition({x: '-'+wi, easing: 'easeOutCubic', duration: duration, complete: tresolve }); break
			}
		}).then(function(){
			$contb.remove()
			$cont.css('z-index', '0') 
			TR.processing[key] = false
			resolve()
		})
	}

	, fadeIn: function(cont, evt, duration, startOpacity, replaceContent){
		return new Promise(function (resolve) {
			var $cont = $(cont)
			$cont.css('opacity', startOpacity||'0')
			if (replaceContent === false)
				; //console.log('do not replace')
			else
				$cont.html(evt.$new)
			$cont.transition({opacity: 1}, duration, 'easeOutCubic', resolve)
		})
	}

	, fadeOut: function(cont, evt, duration, opacity){
		return new Promise(function (resolve) {
			var $cont = $(cont)
			$cont.transition({opacity: opacity||.3}, duration, 'linear', resolve)
		})
	}

	, boxOutCleanup: function (cont){
		return new Promise(function (resolve) {
			$(cont+'-bo').remove()
			resolve()
		})
	}

	, boxOut: function(cont, evt, duration, _scale, topmargin, background_color, cleanup){

		return new Promise(function (resolve) {

			var key = cont+'_boxOut'
			if (TR.processing[key]) {resolve(); return}
			TR.processing[key] = true

			var $cont = $(cont)

			if (evt.fromHref == evt.toHref) {	
				TR.processing[key] = false
				resolve(); return
			}
			var $contb = TR._insertPeer(cont, 'bo')

			var nwi = $(window).width()
			var nhe  = $(window).height()
			var nche  = $cont.height()

			TR._clone($cont, $contb, 'bo__cl')
			TR._clone($cont, $contb, 'bo__bg')

			var top = topmargin||0

			var $clip = TR._clip($cont, 'bo__cl', nwi+'px', (nche-top)+'px', '0px') //top+'px')
			$clip.css('background-color','white')
			$clip.css('z-index','-1')
			$clip.css('top', top)
			
			//ff shadow background
			var $bgclip = TR._clip($cont, 'bo__bg', nwi+'px', (nhe-top)+'px', '0px') //top+'px')
			$bgclip.css('background-color', background_color||'black')
			$bgclip.css('z-index','-2')
			$bgclip.empty()
			$bgclip.css('top', top)

			$cont.empty()

			new Promise(function (tresolve) {
				$clip.css('transformOrigin', 'center 5%')
				$clip.transition({scale: _scale, opacity: .9, backgroundColor: 'gray'}, duration, 'easeOutCubic', tresolve)
			}).then(function(){
				if (cleanup === false)
					; //console.log('do not replace')
				else
					$contb.remove()
				TR.processing[key] = false
				resolve()
			})
		})
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

	, splitVerticalOut: function(cont, evt, duration, bgClass) {

		return new Promise(function (resolve) {

			var key = cont+'_boxOut'
			if (TR.processing[key]) {resolve(); return}
			TR.processing[key] = true

			var $cont = $(cont)

			if (evt.fromHref == evt.toHref) {	
				$cont.html(evt.$new) //just refresh content, optional
				TR.processing[key] = false
				resolve(); return
			}

			var $contb = TR._insertPeer(cont, 'svo')
			
			// compute endpoints math to split screen
			var nwi = $(window).width()
			var wi = nwi+'px'
			var hwi = (nwi / 2) + 'px'
			var he  = ($(window).height()+60) + 'px' //adjust for url bar

			var leftRect = 'rect(0px '+hwi+' '+he+' 0px)'
			var rightRect = 'rect(0px '+wi+' '+he+' '+hwi + ')'
			
			TR._clone($cont, $contb, 'svo__left')
			TR._clone($cont, $contb, 'svo__right')

			if (bgClass) {
				$cont.removeClassPrefix('page')
				$cont.addClass(bgClass)
			}

			$cont.html(evt.$new)

			// =============================================================
			//css clip computed
			var leftClip = $(cont+'-svo__left')
			leftClip.css('clip', leftRect) // clip it
			leftClip.css('position','absolute')
			leftClip.css('z-index', 8)
			leftClip.css('top', '36px')
			leftClip.css('left', '0px')
			leftClip.css('width', wi)
			leftClip.css('min-height', he)
			//leftClip.css('height', he)
			leftClip.css('background-color','white')
			leftClip.css('transform', '')
			
			var rightClip = $(cont+'-svo__right')
			rightClip.css('clip', rightRect)
			rightClip.css('position','absolute')
			rightClip.css('z-index', 10)
			rightClip.css('top', '36px')
			rightClip.css('left', '0px')
			rightClip.css('width', wi)
			rightClip.css('min-height', he)
			//rightClip.css('height', he)
			rightClip.css('background-color','white')
			rightClip.css('transform', '')

			leftClip.transition({x: '-'+hwi, easing: 'easeOutCubic', duration: duration})
			rightClip.transition({x: hwi, easing: 'easeOutCubic', duration: duration})

			setTimeout(function(){ 
				$contb.remove()
				TR.processing[key] = false
			}, duration)
		})
	}
}
