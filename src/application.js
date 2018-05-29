const { RoomService } = require('./services/room/room')
const { dbName } = require('./environment')

class Application {
  constructor(io, client) {
    this.io = io
    this.db = client.db(dbName)

    this.roomService = new RoomService(this.db)

    this.setup()
  }
  setup() {
    const io = this.io
    io
      .sockets
      .on('connection', socket => {
        console.log('connected', socket.id)

        const { room: roomId } = socket.handshake.query
        if (!roomId) {
          console.log("closing connection due to lack of room id")
          socket.emit('errorBC', "Room id is required.")
          socket.disconnect(true)
          return
        }
        socket.join(roomId)
        
        this.roomService.createIfNotExists(roomId)

        this.roomService.getDump(roomId)
          .then(dump => io.to(socket.id).emit('dumpBC', dump))

        socket.on('stroke', data => {
          const { stroke, options } = data
          this.roomService.push({ roomId, path: stroke, options })
          io.to(roomId).emit('strokeBC', data)
        })

        socket.on('undo', () => {
          this.roomService.pop(roomId)
            .then(res => {
              const { popped, peak } = res
              if (popped) {
                io.to(roomId).emit('dumpBC', { snapshot: peak })
              }
            })
        })

        socket.on('redo', () => {
          this.roomService.redo(roomId)
            .then(peak => {
              if (peak) {
                io.to(roomId).emit('dumpBC', { snapshot: peak })
              }
            })
        })

        socket.on('floodFill', data => {
          const start = Date.now()
          const { color, x, y } = data
          this.roomService.floodFill({ roomId, color, x, y })
            .then(snapshot => {
              io.to(roomId).emit('dumpBC', { snapshot })
              console.log(`INFO -- Flood filling finished in ${Date.now() - start} ms`)
            })
        })
      })
  }
}

module.exports = { Application }