const prod = process.env.NODE_ENV === 'production'

const dbUrl = prod ? 'mongodb://admin:admin@ds143990.mlab.com:43990/heroku_w3brzmwp' : 'mongodb://localhost:27017/drawie'
const PORT = process.env.PORT || 5000
const dbName = prod ? 'heroku_w3brzmwp' : 'drawie'

module.exports = {
  dbUrl,
  PORT,
  dbName
}