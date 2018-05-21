const { RoomService } = require('./services/room/room')

class Application {
  constructor(io, client) {
    this.io = io
    this.db = client.db('drawie')

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
      })
  }
}

module.exports = { Application }