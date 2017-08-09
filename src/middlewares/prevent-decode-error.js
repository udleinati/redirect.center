// when access /%
module.exports = (req, res, next) => {
  let err = null
  try {
    decodeURIComponent(req.path)
  } catch (e) {
    err = e
  }
  if (err) {
    return res.status(500).send(err.message)
  }
  next()
}
