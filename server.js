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

baseCtx.fillStyle = 'solid'
baseCtx.strokeStyle = '#AAAAAA'
baseCtx.lineWidth = 5
baseCtx.lineCap = 'round'

function drawStroke(points = []) {
  if (!points.length) {
    return
  }

  const [firstX, firstY] = points[0]
  let current = { x: firstX, y: firstY }
  
  const ctx = baseCtx
  ctx.beginPath()
  ctx.moveTo(firstX, firstY)

  points
    .slice(1)
    .forEach(p => {
      const [x, y] = p
      ctx.lineTo(x, y)
      current = { x, y }
    })

  ctx.stroke()
  ctx.closePath()
}

function fullDump() {
  const ctx = baseCtx
  const imageData = ctx.getImageData(0, 0, base.width, base.height)
  return { data: imageData.data, width: imageData.width, height: imageData.height }
}

staticSocket
  .sockets
  .on('connection', socket => {
    console.log('connected', socket)
    const initialDump = fullDump()
    socket.emit('dumpBC', { dump: initialDump })

    socket.on('drawClick', data => {
      const { broadcast } = socket
      const { x, y, type } = data
      broadcast.emit('draw', { x, y, type })
    })

    socket.on('dump', data => {
      socket.broadcast.emit('dumpBC', data)
    })

    socket.on('stroke', data => {
      console.log(data)
      const { stroke } = data
      drawStroke(stroke)
      socket.broadcast.emit('strokeBC', data)
    })
  })