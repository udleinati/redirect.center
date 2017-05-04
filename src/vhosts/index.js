import Router from 'express'
import fqdn from './fqdn'
import redirect from './redirect'

export default () => {
  let router = Router()

  router.use(fqdn)
  router.use(redirect)

  return router
}
