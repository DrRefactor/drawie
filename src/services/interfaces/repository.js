class IRepository {
  constructor() {
    this.cache = new Cache()
  }
  
  execute(transaction) {
    return new Promise((resolve, reject) => {
      transaction(
        (err, docs) => {
          if (err) {
            return reject(err)
          }
          return resolve(docs)
        }
      )
    })
  }
}

class Cache {
  constructor() {
    this.cached = {}
    this.invalidateTime = 60 * 1000
  }

  set(type, id, item) {
    this.cached[type] = this.cached[type] || {}
    this.cached[type][id] = { item, timestamp: Date.now() }
    console.log(`Caching ${type} ${id}`)
    return Promise.resolve()
  }
  get(type, id, orElse) {
    this.invalidate()
    const collection = this.cached[type] || {}
    const entry = collection[id]
    if (entry) {
      console.log(`Retrieving ${type} ${id} from cache`)
    }
    else {
      console.log(`Entry ${type} ${id} not present in cache.`)
    }
    return entry ?
      Promise.resolve(entry.item) :
      (orElse && orElse() || Promise.resolve())
  }
  invalidate() {
    Object.keys(this.cached).forEach(type => {
      const collection = this.cached[type]
      Object.keys(collection).forEach(id => {
        const { item, timestamp } = collection[id]
        if (this.expired(timestamp)) {
          console.log(`Removing ${type} ${id} from cache. Expired.`)
          delete this.cached[type][id]
        }
      })
    })
  }

  expired(start) {
    return Date.now() - start > this.invalidateTime
  }
}

module.exports = { IRepository }