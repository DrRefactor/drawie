const SocketIO = require('socket.io')

let staticSocket
try {
  staticSocket = SocketIO.listen(4000)
}
catch(e) {
  console.log(e)
  process.exit(1)
}
finally {
  console.log('listening on 4000')
}

staticSocket.sockets
  .on('connection', socket => {
    console.log('connected')
    socket.on('drawClick', data => {
      const { broadcast } = socket
      const { x, y, type } = data
      socket.broadcast.emit('draw', { x, y, type })
    })
  })