'use strict'
const express = require('express')
const server = express()

const C = (require('./config/ServerConfig'))
global.ServerConfig = new C()

server.use(express.static('webroot'))

//###################### start the server
const PORT1 = 8083
server.listen(PORT1, '0.0.0.0', function() {
	console.log('App listening on port '+PORT1)
	console.log('Press Ctrl+C to quit.')
})
