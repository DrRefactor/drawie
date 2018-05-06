const SocketIO = require('socket.io')

let Canvas = require('canvas')
  , Image = Canvas.Image

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

let base = new Canvas(500, 500)
let baseCtx = base.getContext('2d')

staticSocket
  .sockets
  .on('connection', socket => {
    console.log('connected')
    socket.on('drawClick', data => {
      const { broadcast } = socket
      const { x, y, type } = data
      broadcast.emit('draw', { x, y, type })
    })

    socket.on('dump', data => {
      socket.broadcast.emit('dumpBC', data)
    })

    socket.on('stroke', data => {
      socket.broadcast.emit('strokeBC', data)
    })
  })