import mocksHttp from 'node-mocks-http'
import assert from 'assert'
import RedirectService from '../services/redirect.service'

import config from '../config.js'

describe('./services/redirect.service.js', () => {
  const host = 'www.google.com'
  const req = mocksHttp.createRequest({ url: '/events?a=1' })
  const res = mocksHttp.createResponse({ })

  it('simplest redirect', (done) => {
    const redirectService = new RedirectService(req)
    const targetHost = `${host}.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using .opts-uri.', (done) => {
    const redirectService = new RedirectService(req)
    const targetHost = `${host}.opts-uri.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/events?a=1')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using .opts-https.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-https.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'https')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using .opts-slash.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-slash.d1.opts-slash.d-1-2.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/d1/d-1-2')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using .slash.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.slash.d1.slash.d-1-2.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/d1/d-1-2')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using .opts-statuscode-302.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-302.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 302)
    done()
  })

  it('using .opts-statuscode-0. - should fail', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-0.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using mixed options 1', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-uri.opts-slash.abc.opts-slash.def.co.uk.opts-https.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'https')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/abc/def.co.uk/events?a=1')
    assert.equal(result.statusCode, 301)
    done()
  })

  it('using mixed options 2', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.slash.my-site.info.opts-slash.abc.it.opts-statuscode-302.${config.fqdn}`

    const result = redirectService.perform(targetHost)
    assert.equal(result.protocol, 'http')
    assert.equal(result.hostname, host)
    assert.equal(result.path, '/abc.it/my-site.info')
    assert.equal(result.statusCode, 302)
    done()
  })
})
