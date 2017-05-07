import assert from 'assert'
import mocksHttp from 'node-mocks-http'
import preventDecodeError from './prevent-decode-error'

describe('./middlewares/prevent-decode-error.js', () => {
  let res

  beforeEach(() => {
    res = mocksHttp.createResponse({
      eventEmitter: require('events').EventEmitter
    })
  })

  it('should expect error', (done) => {
    const req = mocksHttp.createRequest({
      url: '/%'
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 500)
      assert.equal(res._getData(), 'URI malformed')
      done()
    })

    preventDecodeError(req, res, null)
  })

  it('success', (done) => {
    const req = mocksHttp.createRequest({
      url: '/'
    })

    preventDecodeError(req, res, () => {
      done()
    })
  })
})
