import Router from 'express'
import RedirectCallback from './redirect.callback'

export default () => {
  const router = Router()

  router.all('*', RedirectCallback)

  return router
}
