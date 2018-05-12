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

// let base = new Canvas(500, 500)
// let baseCtx = base.getContext('2d')

// baseCtx.fillStyle = 'solid'
// baseCtx.strokeStyle = '#AAAAAA'
// baseCtx.lineWidth = 5
// baseCtx.lineCap = 'round'

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

  fitBounds() {
    let paths = this.paths.slice()
    const toDeleteCount = this.paths.length - this.historyBounds.lower
    if (toDeleteCount <= 0) {
      return
    }
    const toApply = paths.splice(0, toDeleteCount)
    toApply.forEach(this.apply)
    this.paths = paths
  }

  apply(path) {
    drawStroke(path, this.ctx)
  }

  get dump() {
    const destElement = new NodeCanvas(this.width, this.height)
    const destCtx = destElement.getContext('2d')
    this.setup(destCtx, this.options)
    
    const baseImageData = fullDump(this.ctx, this.element, true)
    destCtx.putImageData(baseImageData, this.width, this.height)

    let paths = this.paths.slice()
    let toApply = []
    const toDeleteCount = paths.length - this.historyBounds.lower
    if (toDeleteCount > 0) {
      toApply = paths.splice(0, toDeleteCount)
    }
    
    toApply.forEach(path => drawStroke(path, destCtx))
    return { dump: fullDump(destCtx, destElement), paths }
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
      room = new Room({ id: roomId })
      rooms[roomId] = room
    }

    socket.emit('dumpBC', room.dump)

    socket.on('drawClick', data => {
      const { broadcast } = socket
      const { x, y, type } = data
      io.to(roomId).emit('draw', { x, y, type })
    })

    socket.on('dump', data => {
      io.to(roomId).emit('dumpBC', data)
    })

    socket.on('stroke', data => {
      console.log(data)
      const { stroke } = data
      room.save(stroke)
      io.to(roomId).emit('strokeBC', data)
    })
  })