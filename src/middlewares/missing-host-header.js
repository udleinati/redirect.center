// curl --verbose --header 'Host:' http://localhost:3000
export default (req, res, next) => {
  if (!req.headers.host) {
    return res.status(500).send('Missing Host Header')
  }
  next()
}
