function drawStroke(points = [], ctx) {
  if (!points.length || !ctx) {
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

module.exports = { drawStroke, fullDump };