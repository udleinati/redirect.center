const assert = require('assert')
const mocksHttp = require('node-mocks-http')
const addRequestId = require('./add-request-id')

describe('./middlewares/add-request-id.js', () => {
  let res

  beforeEach(() => {
    res = mocksHttp.createResponse({
      eventEmitter: require('events').EventEmitter
    })
  })

  it('return requestId', (done) => {
    const req = mocksHttp.createRequest({
      url: '/'
    })

    addRequestId(req, res, () => {
      assert.equal(typeof (req.requestId), 'string')
      done()
    })
  })
})
