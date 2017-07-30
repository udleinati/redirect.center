import mocksHttp from 'node-mocks-http'
import assert from 'assert'
import sinon from 'sinon'
import StatisticService from './statistic.service'
import config from '../config'

describe('./services/statistic.service.js', () => {
  const req = mocksHttp.createRequest()

  it('receive overview', (done) => {
    new StatisticService(req).overview().then((result) => {
      assert.equal(result.everHosts, 1)
      assert.equal(result.everDomains, 1)
      assert.equal(result.periodHosts, 1)
      assert.equal(result.periodDomains, 1)
      done()
    })
  })

  it('should return overview error', (done) => {
    const err = { code: 'ERRORCODE', message: 'error-message' }
    sinon.stub(Promise, 'all').returns(Promise.reject(err))

    new StatisticService(req).overview('www.google.com').catch((err) => {
      assert.equal(err.code, 'ERRORCODE')
      assert.equal(err.message, 'error-message')
      Promise.all.restore()
      done()
    })
  })

  it('put information', (done) => {
    new StatisticService(req).put('www.google.com').then((result) => {
      assert.equal(result, true)
      done()
    })
  })

  it('should return put error', (done) => {
    const err = { code: 'ERRORCODE', message: 'error-message' }
    sinon.stub(Promise, 'all').returns(Promise.reject(err))

    new StatisticService(req).put('www.google.com').catch((err) => {
      assert.equal(err.code, 'ERRORCODE')
      assert.equal(err.message, 'error-message')
      Promise.all.restore()
      done()
    })
  })

  it('statistic disabled - put', (done) => {
    config.activateCounter = 'false'
    new StatisticService(req).put('www.google.com').then((result) => {
      assert.equal(result, true)
      config.activateCounter = 'true'
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('statistic disabled - overview', (done) => {
    config.activateCounter = 'false'
    new StatisticService(req).overview('www.google.com').then((result) => {
      assert.deepEqual(result, {})
      config.activeCounter = 'true'
      done()
    }).catch((err) => {
      done(err)
    })
  })
})
