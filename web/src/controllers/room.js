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
    let { element, ctx } = this.createCanvas({ width, height })
    
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

  replace(imageData, paths = []) {
    this.ctx.putImageData(imageData, 0, 0)
    this.paths = paths
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

  createCanvas({ width = 500, height = 500 } = {}) {
    let element = document.createElement('canvas')
    element.width = width
    element.height = height
    let ctx = element.getContext('2d')
    return { element, ctx }
  }
}

export { Room }