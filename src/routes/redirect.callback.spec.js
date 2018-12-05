const assert = require('assert')
const mocksHttp = require('node-mocks-http')
const sinon = require('sinon')
const dns = require('dns')
const redirectCallback = require('./redirect.callback')
const config = require('../config')

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

    redirectCallback(req, res)
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

    redirectCallback(req, res)
  })

  it('should return error 500 ENODATA', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'www.test.com'
      }
    })

    callback.yields({
      code: 'ENODATA',
      message: 'ENODATA'
    }, null)

    res.on('render', () => {
      const context = res._getRenderData()
      assert.equal(res.statusCode, 500)
      assert.equal(context.err.code, 'ENODATA')
      done()
    })

    redirectCallback(req, res)
  })

  it('simple redirect', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'www.test.com'
      }
    })

    callback.callsFake((host, type, cb) => {
      cb(null, [`www.google.com.${config.fqdn}`])
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 301)
      assert.equal(res._getRedirectUrl(), 'http://www.google.com')
      done()
    })

    redirectCallback(req, res)
  })

  it('domain to redirect', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'test.com'
      }
    })

    callback.callsFake((host, type, cb) => {
      if (host === 'test.com') {
        cb({
          code: 'ENODATA'
        }, null)
      } else if (host === 'redirect.test.com') {
        cb(null, [`www.google.com.${config.fqdn}`])
      }
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 301)
      assert.equal(res._getRedirectUrl(), 'http://www.google.com')
      done()
    })

    redirectCallback(req, res)
  })

  it('domain returns CNAME', (done) => {
    const req = mocksHttp.createRequest({
      url: '/',
      headers: {
        host: 'test.com'
      }
    })

    callback.callsFake((host, type, cb) => {
      cb(null, [`www.google.com.${config.fqdn}`])
    })

    res.on('end', () => {
      assert.equal(res.statusCode, 301)
      assert.equal(res._getRedirectUrl(), 'http://www.google.com')
      done()
    })

    redirectCallback(req, res)
  })
})
