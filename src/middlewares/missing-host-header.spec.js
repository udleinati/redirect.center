const assert = require('assert')
const mocksHttp = require('node-mocks-http')
const missingHostHeader = require('./missing-host-header')

describe('./middlewares/add-request-id.js', () => {
  let res

  beforeEach(() => {
    res = mocksHttp.createResponse({
      eventEmitter: require('events').EventEmitter
    })
  })

  it('success', (done) => {
    const req = mocksHttp.createRequest({
      headers: {
        host: 'localhost'
      },
      url: '/'
    })

    missingHostHeader(req, res, () => {
      assert.equal(req.headers.host, 'localhost')
      done()
    })
  })

  it('should expect error', (done) => {
    const req = mocksHttp.createRequest({
      url: '/'
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 500)
      assert.equal(res._getData(), 'Missing Host Header')
      done()
    })

    missingHostHeader(req, res, null)
  })
})
