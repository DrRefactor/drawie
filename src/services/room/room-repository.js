const { IRepository } = require('../interfaces/repository')

class RoomRepository extends IRepository {
  constructor(db) {
    super()
    this.db = db
  }

  findById(id, cachedEntry) {
    // if (cachedEntry) {
    //   return Promise.resolve(cachedEntry)
    // }
    const collection = this.db.collection('rooms')

    const transaction = onComplete => collection.findOne({ id }, onComplete)

    return this.cache.get('room', id, () => this.execute(transaction))
  }
  save(roomEntity) {
    const collection = this.db.collection('rooms')
    
    const { id } = roomEntity
    
    return this.findById(id)
      .then(entity => {
        this.cache.set('room', id, roomEntity)
        const transaction = entity ?
          onComplete => collection.updateOne({ id }, { $set: roomEntity }, onComplete) :
          onComplete => collection.insertOne(roomEntity, onComplete)
            
        return this.execute(transaction)
      })
  }
}

module.exports = { RoomRepository }