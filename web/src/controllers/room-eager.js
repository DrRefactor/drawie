class RoomEager {
  constructor({
    snapshots = [],
    id,
    historyBounds = {
      lower: 20,
      higher: 50
    }
  } = {}) {
    this.snapshots = snapshots
    this.id = id
    this.historyBounds = historyBounds
  }

  replace(snapshots = []) {
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

  get snapshot() {
    return this.snapshots[this.snapshots.length - 1]
  }

  get dump() {
    return { dump: fullDump(this.ctx, this.element), paths: this.paths }
  }
}

export { RoomEager }