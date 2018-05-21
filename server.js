const SocketIO = require('socket.io')
const express = require('express')
const app = express()
const server = require('http').Server(app)
const path = require('path')
const { PORT } = require('./src/environment')
const { initDB } = require('./src/database')
const { Application } = require('./src/application')

server.listen(PORT)

let io
try {
  io = SocketIO(server)
}
catch(e) {
  console.log(e)
  process.exit(1)
}
finally {
  console.log(`Running on ${PORT}`)
}

app.use(express.static(path.resolve(__dirname, 'web/dist')));

let application
initDB()
  .then(client => {
    application = new Application(io, client)
  })
  .catch(e => {
    console.log(e)
    process.exit(2)
  })