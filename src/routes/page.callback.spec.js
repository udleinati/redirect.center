import assert from 'assert'
import mocksHttp from 'node-mocks-http'
import { getPublicPage, allPageNotFound } from './page.callback'

describe('./page.callback.js', () => {
  let res

  beforeEach(() => {
    res = mocksHttp.createResponse({
      eventEmitter: require('events').EventEmitter
    })
  })

  it('render public page', (done) => {
    const req = mocksHttp.createRequest({
      url: '/'
    })

    res.on('render', () => {
      assert.equal(res.statusCode, 200)
      done()
    })

    getPublicPage(req, res)
  })

  it('should return error 404', (done) => {
    const req = mocksHttp.createRequest({
      url: '/notFound'
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 404)
      assert.equal(res._getData(), 'Not Found')
      done()
    })

    allPageNotFound(req, res)
  })
})
