class IRepository {
  constructor() {}
  
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

module.exports = { IRepository }