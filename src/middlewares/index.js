import Router from 'express'
import preventDecodeError from './prevent-decode-error'
import addRequestId from './add-request-id'

export default () => {
  let router = Router()

  router.use(preventDecodeError)
  router.use(addRequestId)

  return router
}
