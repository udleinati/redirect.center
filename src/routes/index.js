import Router from 'express'
import page from './page'
import redirect from './redirect'

export default () => {
  let router = Router()

  router.use(page)
  router.use(redirect())

  return router
}
