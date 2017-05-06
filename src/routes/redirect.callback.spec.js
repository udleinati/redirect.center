import assert from 'assert'
import mocksHttp from 'node-mocks-http'
import sinon from 'sinon'
import dns from 'dns'
import RedirectCallback from './redirect.callback'
import config from '../config'

describe('./redirect.callback.js', () => {
  let callback, res

  beforeEach(() => {
    callback = sinon.stub(dns, 'resolve')
    res = mocksHttp.createResponse({
      eventEmitter: require('events').EventEmitter
    })
  })

  afterEach(() => {
    dns.resolve.restore()
  })

  it('should return error 500 MORETHANONE', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'multiplehosts.test.com'
      }
    })

    callback.yields(null, ['host1', 'host2'])

    res.on('render', () => {
      const context = res._getRenderData()
      assert.equal(res.statusCode, 500)
      assert.equal(context.err.code, 'MORETHANONE')
      done()
    })

    RedirectCallback(req, res)
  })

  it('should return error 500 NOTADOMAIN', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'multiplehosts.test.com'
      }
    })

    callback.yields(null, ['127.0.0.1'])

    res.on('render', () => {
      const context = res._getRenderData()
      assert.equal(res.statusCode, 500)
      assert.equal(context.err.code, 'NOTADOMAIN')
      done()
    })

    RedirectCallback(req, res)
  })

  it('should return error 500 ENODATA', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'www.test.com'
      }
    })

    callback.yields({ code: 'ENODATA', message: 'ENODATA' }, null)

    res.on('render', () => {
      const context = res._getRenderData()
      assert.equal(res.statusCode, 500)
      assert.equal(context.err.code, 'ENODATA')
      done()
    })

    RedirectCallback(req, res)
  })

  it('simple redirect', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'test.com'
      }
    })

    callback.yields(null, [ `www.google.com.${config.fqdn}` ])

    res.on('end', () => {
      assert.equal(res.statusCode, 301)
      assert.equal(res._getRedirectUrl(), 'http://www.google.com')
      done()
    })

    RedirectCallback(req, res)
  })
})
