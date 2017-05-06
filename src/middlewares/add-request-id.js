import cuid from 'cuid'

export default (req, res, next) => {
  req.requestId = cuid()
  next()
}
