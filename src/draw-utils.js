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

function fill({ x, y, element, ctx, color }) {
  const data = ctx.getImageData(0, 0, element.width, element.height).data
  const canvasWidth = element.width
  const canvasHeight = element.height
  const getPixelColor = (x, y) => {
    const [ri, gi, bi] = getColorIndicesForCoord(x, y, canvasWidth)
    
    const r = data[ri]
    const g = data[gi]
    const b = data[bi]

    return rgbToHex(r, g, b)
  }

  ctx.fillStyle = color
  const fillRect = (x, y) => {
    ctx.fillRect( x, y, 1, 1 )
  }
  
  // function fillBfs({ x, y }) {
  //   visited[x + ',' + y] = true
  //   fillRect(x, y, color)
  //   const neighbours = getNeigboursCoords(x, y, canvasWidth, canvasHeight)
  //     .filter(isNotVisited)
  //     .filter(hasSameColor)
  //     .forEach(indices => {
  //       const [x, y] = indices
  //       fillBfs({ x, y })
  //     })
  // }

  /// Same as above, not exceeding call-stack limit though
  /// BFS in flat-recursive manner
  function fillBfs({ x, y }) {
    let visited = {}
    visited[x + ',' + y] = true
    let openStates = [[x, y]]
    const targetColor = getPixelColor(x, y)
    const isNotVisited = indices => !visited[indices[0] + ',' + indices[1]]
    const hasSameColor = indices => getPixelColor(indices[0], indices[1]) === targetColor
    
    while (openStates.length) {
      const [x, y] = openStates.shift()
      fillRect(x, y)
      
      const neighbours = getNeigboursCoords(x, y, canvasWidth, canvasHeight)
        .filter(isNotVisited)
        .filter(hasSameColor)
        
      // neighbours.forEach(indices => visited[indices[0] + ',' + indices[1]] = true)
      // again, performance
      const neighboursLength = neighbours.length
      for (let i = 0; i < neighboursLength; i++) {
        const indices = neighbours[i]
        visited[indices[0] + ',' + indices[1]] = true
      }

      openStates = openStates.concat(neighbours)
    }
  }

  fillBfs({ x, y })
}

function getNeigboursCoords(x, y, width, height) {
  let neighbours = []
  if (x > 0) {
    neighbours.push([x - 1, y])
    if (y > 0) {
      neighbours.push([x - 1, y - 1])
    }
    if (y < height - 1) {
      neighbours.push([x - 1, y + 1])
    }
  }
  if (y > 0) {
    neighbours.push([x, y - 1])
  }
  if (x < width - 1) {
    neighbours.push([x + 1, y])
    if (y > 0) {
      neighbours.push([x + 1, y - 1])
    }
    if (y < height - 1) {
      neighbours.push([x + 1, y + 1])
    }
  }
  if (y < height - 1) {
    neighbours.push([x, y + 1])
  }
  return neighbours
}

function getColorIndicesForCoord(x, y, width) {
  const red = y * (width * 4) + x * 4
  return [red, red + 1, red + 2, red + 3]
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

module.exports = { drawStroke, fullDump, toSnapshot, replace, setup, fill };