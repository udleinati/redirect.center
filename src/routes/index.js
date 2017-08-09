const Router = require('express')
const page = require('./page')
const redirect = require('./redirect')

module.exports = () => {
  const router = Router()

  router.use(page())
  router.use(redirect())

  return router
}
