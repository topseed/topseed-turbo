//Loaded from main.js
//Helper for Polymer 1 Components
var TP = { //class:
	_loadedComp : {'exComp': true} // don't load 2x

	, loadComp : function(url){
		return new Promise(function (resolve, reject){
			if (url in TP._loadedComp) {//guard: we loaded it before, thank you very much
				console.log('already loaded')
				resolve("OK2")
			} else {
				fetch(url, {
					method: 'get'
				}).then(function(response) {
					if (!response.ok) {
						console.log('not ok')
						console.log(response)
						reject(response.statusText)
					} 
					return response.text()
				}).then(function(txt) {
					//registerComp = function(){} //null function	
					TP._loadedComp[url] = true
					console.log('loading (again?):', url)

					//firefox
					HTMLImports.whenReady(function() {
						Polymer.Base.importHref(url, function() {
							console.log('importHref done')
							return resolve('OK')
						})
					})
				})	
			}
		})	
	}
}