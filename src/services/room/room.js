const NodeCanvas = require('canvas')
const Image = NodeCanvas.Image
const { drawStroke, toSnapshot, replace, setup } = require('../../draw-utils')

const { RoomRepository } = require('./room-repository')
const { RoomEntity } = require('./room-entity')

class RoomService {
  constructor(db) {
    this.repository = new RoomRepository(db)
  }

  create(dto = {}) {
    const entity = new RoomEntity(dto)

    this.repository.save(entity)
  }

  getOne(roomId) {
    return this.repository
      .findById(roomId)
  }

  createIfNotExists(roomId) {
    return this.getOne(roomId)
      .then(entity => {
        if (!entity) {
          return this.create({ id: roomId })
        }
      })
  }
  
  push({ roomId, path, options = {} } = {}) {
    return this.repository
      .findById(roomId)
      .then(entity => {
        const element = new NodeCanvas(entity.width, entity.height)
        const ctx = element.getContext('2d')
        const recentSnapshot = this.recentSnapshot(entity)

        return replace({ ctx, snapshot: recentSnapshot })
          .then(() => {
            setup(ctx, options)
            drawStroke(path, ctx)

            let snapshots = entity.snapshots.concat(toSnapshot(element))
            snapshots = this.fitBounds(entity, snapshots)
            const redoStack = []
            const toSave = { ...entity, ...{ snapshots, redoStack } }
            return this.repository.save(toSave)
          })
          .catch(console.warn)
      })
  }

  pop(roomId) {
    return this.repository
      .findById(roomId)
      .then(entity => {
        const snapshots = entity.snapshots.slice()
        const redoStack = entity.redoStack.slice()
        let popped
        if (snapshots.length) {
          if (this.recentSnapshot(entity) === '') {
            return
          }
          
          popped = snapshots.pop()
          redoStack.push(popped)
          
          this.repository.save({ ...entity, snapshots, redoStack })
        }
        const recent = snapshots[snapshots.length - 1]
        return { popped, peak: recent }
      })
  }

  redo(roomId) {
    return this.repository
      .findById(roomId)
      .then(entity => {
        const redoStack = entity.redoStack.slice()
        const snapshots = entity.snapshots.slice()

        if (redoStack.length) {
          const peak = redoStack.pop()
          snapshots.push(peak)
          
          this.repository.save({ ...entity, snapshots, redoStack })
          return peak
        }
      })
  }

  fitBounds(entity, snapshots) {
    snapshots = snapshots.slice()
    const toDeleteCount = snapshots.length - entity.historyBound
    if (toDeleteCount <= 0) {
      return snapshots
    }
    snapshots.splice(0, toDeleteCount)
    return snapshots
  }

  recentSnapshot(entity) {
    return entity.snapshots[entity.snapshots.length - 1]
  }

  getDump(roomId) {
    return this.repository
      .findById(roomId)
      .then(entity => {
        if (entity) {
          return { snapshot: this.recentSnapshot(entity) }
        }
        return { snapshot: '' }
      })
  }
}

module.exports = { RoomService }