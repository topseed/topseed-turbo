
// COMPS ////////////////////////////////////////////////////////////////////////////////////////
var TW = { //class:
	_loadedComp : {'exComp': true} // don't load 2x
	, loadComp: function(url, $here, callbackFunc) { //load template, don't forget #comps
		if(url in TW._loadedComp) {//guard: we loaded it before, thank you very much
			console.log('already loaded')
			callbackFunc()
			return
		} else {
			fetch(url, {
				method: 'get'
			}).then(function(response) {
				if (!response.ok) {
					console.log('not ok')
					console.log(response)
					throw Error(response.statusText)
				}
				return response.text()
			}).then(function(txt) {
				console.log('loading (again?)')
				TW._loadedComp[url] = true
				$here.append( txt )
				callbackFunc()
			})
		}
	}//()

	, _isCReg: function(name) {
		return (window.creg && window.creg.hasOwnProperty(name))
		//	return window.creg[name]
		//return false
	}
	
	, _cReg: function(name, comp) { // register a component
		if (!window.creg)
			window.creg = {}
		console.log('creg', name)
		window.creg[name] = comp 
	}

	, registerCustomElement: function(tag, KlassEl) {//register class
		var xx
		if(!TW._isCReg(tag)) {
			if (tag.indexOf('-')==-1)
				throw 'Custom element name must contain a - (dash)!'  
			xx = document.registerElement(tag, {prototype: KlassEl})
			TW._cReg(tag, xx)
		}
		console.log(window.creg)
		xx = TW._isCReg(tag)	
		return xx
	}

	, regC: function(tag, KlassEl) {
		return TW.registerCustomElement(tag, KlassEl)
	}	

	, attachShadow: function(thiz, templ) {
		var t = document.querySelector(templ)
		var clone = document.importNode(t.content, true)
		//var shadow = this.createShadowRoot() NOPE
		var shadow = thiz.attachShadow({mode: 'open'})
		shadow.appendChild(clone)
		return shadow
	}

	, attS: function(thiz, templ){
		return TW.attachShadow(thiz, templ)
	}

	, bind: function (tpl, data) { // take tmpl and bind w/ data
		var tpl1Foo = doT.template(tpl)
		return tpl1Foo(data)
	}
}
