import Router from 'express'
import domain from './domain'
import redirect from './redirect'

export default () => {
  let router = Router()

  // http://localhost.com:3000/%c0%ae%c0%ae

  router.use((req, res, next) => {
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
  })

  router.use(domain)
  router.use(redirect())

  return router
}
