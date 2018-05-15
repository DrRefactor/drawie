class RoomEager {
  constructor({
    snapshots = [],
    id,
    historyBounds = {
      lower: 20,
      higher: 50
    }
  } = {}) {
    this.setup(ctx, opts)

    this.snapshots = snapshots
    this.id = id
    this.historyBounds = historyBounds
  }

  replace(imageData, snapshots = []) {
    this.ctx.putImageData(imageData, 0, 0)
    this.snapshots = snapshots
  }

  push(snapshot) {
    this.snapshots.push(snapshot)
    if (this.snapshots.length > this.historyBounds.higher) {
      this.fitBounds()
    }
  }

  pop() {
    if (this.snapshots.length) {
      return this.snapshots.pop()
    }
  }

  fitBounds() {
    let snapshots = this.snapshots.slice()
    const toDeleteCount = this.snapshots.length - this.historyBounds.lower
    if (toDeleteCount <= 0) {
      return
    }
    const toApply = snapshots.splice(0, toDeleteCount)
    toApply.forEach(path => this.apply(path))
    this.snapshots = snapshots
  }

  get dump() {
    return { dump: fullDump(this.ctx, this.element), paths: this.paths }
  }
}

export { RoomEager }