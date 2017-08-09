const Router = require('express')
const preventDecodeError = require('./prevent-decode-error')
const addRequestId = require('./add-request-id')
const missingHostHeader = require('./missing-host-header')

module.exports = () => {
  const router = Router()

  router.use(preventDecodeError)
  router.use(missingHostHeader)
  router.use(addRequestId)

  return router
}
