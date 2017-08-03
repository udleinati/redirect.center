import Router from 'express'
import preventDecodeError from './prevent-decode-error'
import addRequestId from './add-request-id'
import missingHostHeader from './missing-host-header'

export default () => {
  const router = Router()

  router.use(preventDecodeError)
  router.use(missingHostHeader)
  router.use(addRequestId)

  return router
}
