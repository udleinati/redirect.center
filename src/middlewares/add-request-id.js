const cuid = require('cuid')

module.exports = (req, res, next) => {
  req.requestId = cuid()
  next()
}
