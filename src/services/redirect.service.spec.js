import mocksHttp from 'node-mocks-http'
import assert from 'assert'
import RedirectService from '../services/redirect.service'

import config from '../config.js'

describe('./services/redirect.service.js', () => {
  const host = 'www.google.com'
  const req = mocksHttp.createRequest({ url: '/events?a=1' })
  const res = mocksHttp.createResponse({ })

  it('simplest redirect', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .opts-uri.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-uri.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '/events?a=1')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .opts-https.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-https.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'https')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .opts-slash.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-slash.d1.opts-slash.d-1-2.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '/d1/d-1-2')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .slash.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.slash.d1.slash.d-1-2.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '/d1/d-1-2')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .opts-statuscode-302.', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-302.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '')
      assert.equal(result.statusCode, 302)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using .opts-statuscode-0. - should fail', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-statuscode-0.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'http')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('using mixed options', (done) => {
    const redirectService = new RedirectService(req, res)
    const targetHost = `${host}.opts-uri.opts-slash.abc.opts-slash.def.opts-https.${config.fqdn}`

    redirectService.perform(targetHost).then((result) => {
      assert.equal(result.protocol, 'https')
      assert.equal(result.hostname, host)
      assert.equal(result.path, '/abc/def/events?a=1')
      assert.equal(result.statusCode, 301)
      done()
    }).catch((err) => {
      done(err)
    })
  })
})
