const NodeCanvas = require('canvas')
const Image = NodeCanvas.Image

function drawStroke(points = [], ctx) {
  if (!points.length || !ctx) {
    console.log('invalid stroke to draw on backend', points, ctx)
    return
  }

  const [firstX, firstY] = points[0]
  let current = { x: firstX, y: firstY }
  
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

function toSnapshot(element) {
  return element.toDataURL()
}

function replace({ ctx, snapshot = '' }) {
  return new Promise((resolve, reject) => {
    if (!ctx) {
      return reject("ctx is null")
    }
    ctx.clearRect(0, 0, this.width, this.height)
    if (!snapshot) {
      return resolve()
    }
    
    let image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, this.width, this.height)
      ctx.drawImage(image, 0, 0)
      return resolve()
    }
    image.src = snapshot
  })
}

function setup(ctx, options) {
  Object.keys(options).forEach(key => {
    ctx[key] = options[key]
  })
}

function fullDump(ctx, element, plain = false) {
  if (!ctx) {
    return
  }
  const imageData = ctx.getImageData(0, 0, element.width, element.height)

  if (plain) {
    return imageData
  }
  return { data: imageData.data, width: imageData.width, height: imageData.height }
}

module.exports = { drawStroke, fullDump, toSnapshot, replace, setup };