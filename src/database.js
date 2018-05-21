const { dbUrl } = require('./environment')
const { MongoClient } = require('mongodb')

function initDB() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(dbUrl, function(err, client) {
      if (err) {
        console.log(err)
        reject(err)
        return
      }
      console.log("Connected successfully to mongo server");

      resolve(client)
    })
  })
}

module.exports = { initDB }