import Router from 'express'
import domain from './domain'
import redirect from './redirect'

export default () => {
  let router = Router()

  router.use(domain)
  router.use(redirect())

  return router
}
