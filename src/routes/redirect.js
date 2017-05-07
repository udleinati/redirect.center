import Router from 'express'
import redirectCallback from './redirect.callback'

export default () => {
  const router = Router()

  router.all('*', redirectCallback)

  return router
}
