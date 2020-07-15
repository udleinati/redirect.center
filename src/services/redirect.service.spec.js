const mocksHttp = require('node-mocks-http')
const assert = require('assert')
const RedirectService = require('../services/redirect.service')

const config = require('../config.js')

describe('./services/redirect.service.js', () => {
  const host = 'www.google.com'
  const req = mocksHttp.createRequest({
    url: '/events?a=1'
  })
  const res = mocksHttp.createResponse({})

  it('invalid url', () => {
    const redirectService = new RedirectService(req)
    const targetHost = `invalid.opts-percent.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, 'invalid%')
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 500)
  })

  it('invalid https url', () => {
    const redirectService = new RedirectService(req)
    const targetHost = `invalid.opts-percent.opts-https.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'https')
    assert.equal(result.hostname, 'invalid%')
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 500)
  })

  it('simplest redirect', () => {
    const redirectService = new RedirectService(req)
    const targetHost = `${host}.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-uri.', () => {
    const redirectService = new RedirectService(req)
    const targetHost = `${host}.opts-uri.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/events?a=1')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-https.', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-https.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'https')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-slash. 1', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-slash.d1.opts-slash.d-1-2.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/d1/d-1-2')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-slash. 2', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-slash.dd1.opts-slash.dd-11-22.opts-slash.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/dd1/dd-11-22/')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-query.', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-query.q1.opts-eq.1.opts-query.q2.opts-eq.2.opts-query.q3.opts-eq.3.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/?q1=1&q2=2&q3=3')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-hash.', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-hash.fragment.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/#fragment')
    assert.equal(result.statusCode, 301)
  })

  it('using special characters', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-slash.a.opts-dot.htm.opts-slash.opts-query.q1.opts-eq.1.opts-plus.1.opts-query.q2.opts-eq.opts-percent.2e.opts-colon.opts-dot.opts-hash.h.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/a.htm/?q1=1+1&q2=%2e:.#h')
    assert.equal(result.statusCode, 301)
  })

  it('using brief special characters', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}._s.a._d.htm._s._q.q1._e.1._p.1._q.q2._e._pc.2e._c._d._h.h.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/a.htm/?q1=1+1&q2=%2e:.#h')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-port-8080.', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-port-8080.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host + ':8080')
    assert.equal(result.path, '/')
    assert.equal(result.statusCode, 301)
  })

  it('using .opts-statuscode-302.', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-302.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/')
    assert.equal(result.statusCode, 302)
  })

  it('using .opts-statuscode-0. - should fail', () => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-0.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/')
    assert.equal(result.statusCode, 301)
  })
})
