const SocketIO = require('socket.io')

let NodeCanvas = require('canvas')
  , Image = NodeCanvas.Image

const { drawStroke, fullDump } = require('./src/draw-utils')
const utils = require('./src/utils')

let io
try {
  io = SocketIO.listen(4000)
}
catch(e) {
  console.log(e)
  process.exit(1)
}
finally {
  console.log('listening on 4000')
}

class Room {
  constructor({
    width = 500,
    height = 500,
    options = {},
    paths = [],
    id,
    historyBounds = {
      lower: 20,
      higher: 50
    }
  } = {}) {
    const element = new NodeCanvas(width, height)
    const ctx = element.getContext('2d')
    
    let opts = {}
    const {
      fillStyle = 'solid',
      strokeStyle = '#aaa',
      lineWidth = 5,
      lineCap = 'round',
      ...other
    } = options
    opts.fillStyle = fillStyle
    opts.strokeStyle = strokeStyle
    opts.lineWidth = lineWidth
    opts.lineCap = lineCap

    opts = { ...other, ...opts }

    this.setup(ctx, opts)

    this.options = opts
    this.element = element
    this.ctx = ctx
    this.paths = paths
    this.id = id
    this.width = width
    this.height = height
    this.historyBounds = historyBounds
  }

  setup(ctx, options) {
    Object.keys(options).forEach(key => {
      ctx[key] = options[key]
    })
  }

  save(path) {
    this.paths.push(path)
    if (this.paths.length > this.historyBounds.higher) {
      this.fitBounds()
    }
  }

  pop() {
    if (this.paths.length) {
      return this.paths.pop()
    }
  }

  fitBounds() {
    let paths = this.paths.slice()
    const toDeleteCount = this.paths.length - this.historyBounds.lower
    if (toDeleteCount <= 0) {
      return
    }
    const toApply = paths.splice(0, toDeleteCount)
    toApply.forEach(path => this.apply(path))
    this.paths = paths
  }

  apply(path) {
    drawStroke(path, this.ctx)
  }

  get dump() {
    return { dump: fullDump(this.ctx, this.element), paths: this.paths }
  }
}

let rooms = {}

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

    let room = rooms[roomId]
    if (room == null) {
      console.log('creating room: ', roomId)
      room = new Room({ id: roomId })
      rooms[roomId] = room
    }

    io.to(socket.id).emit('dumpBC', room.dump)
    console.log('dump created.')

    socket.on('dump', data => {
      io.to(roomId).emit('dumpBC', data)
    })

    socket.on('stroke', data => {
      const { stroke } = data
      room.save(stroke)
      io.to(roomId).emit('strokeBC', data)
    })

    socket.on('undo', () => {
      const popped = room.pop()
      if (popped && popped.length) {
        io.to(roomId).emit('dumpBC', room.dump)
      }
    })
  })