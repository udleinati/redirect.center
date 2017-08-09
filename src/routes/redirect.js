const Router = require('express')
const redirectCallback = require('./redirect.callback')

module.exports = () => {
  const router = Router()

  router.all('*', redirectCallback)

  return router
}
