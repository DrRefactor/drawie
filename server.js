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
    snapshots = [''],
    id,
    historyBound = 50
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
    this.snapshots = snapshots
    this.id = id
    this.width = width
    this.height = height
    this.historyBound = historyBound
  }

  setup(ctx, options) {
    Object.keys(options).forEach(key => {
      ctx[key] = options[key]
    })
  }

  push(path) {
    this.apply(path)

    if (this.snapshots.length > this.historyBound) {
      this.fitBounds()
    }
  }

  pop() {
    let res
    if (this.snapshots.length) {
      if (this.recentSnapshot === '') {
        return
      }
      console.log(this.recentSnapshot.length)
      res = this.snapshots.pop()
      const recent = this.snapshots[this.snapshots.length - 1]
      if (recent != null) {
        this.replace(recent)
      }
    }
    return res
  }

  fitBounds() {
    let snapshots = this.snapshots.slice()
    const toDeleteCount = this.snapshots.length - this.historyBound
    if (toDeleteCount <= 0) {
      return
    }
    snapshots.splice(0, toDeleteCount)
    this.snapshots = snapshots
  }

  apply(path) {
    drawStroke(path, this.ctx)
    this.snapshots.push(this.snapshot)
  }

  replace(snapshot = '') {
    const ctx = this.ctx
    if (!ctx) {
      return
    }
    this.ctx.clearRect(0, 0, this.width, this.height)
    if (!snapshot) {
      return
    }
    
    let image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, this.width, this.height)
      ctx.drawImage(image, 0, 0)
    }
    image.src = snapshot
  }

  get recentSnapshot() {
    return this.snapshots[this.snapshots.length - 1]
  }

  get snapshot() {
    return this.element.toDataURL()
  }

  get dump() {
    return { snapshot: this.snapshot }
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

    socket.on('stroke', data => {
      const { stroke } = data
      room.push(stroke)
      io.to(roomId).emit('strokeBC', data)
    })

    socket.on('undo', () => {
      const popped = room.pop()
      io.to(roomId).emit('dumpBC', room.dump)
    })
  })