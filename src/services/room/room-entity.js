class RoomEntity {
  constructor({
    width = 500,
    height = 500,
    options = {},
    snapshots = [''],
    id,
    historyBound = 50,
    redoStack = []
  } = {}) {
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

    this.options = opts
    this.snapshots = snapshots
    this.id = id
    this.width = width
    this.height = height
    this.historyBound = historyBound
    this.redoStack = redoStack
  }
}

module.exports = { RoomEntity }