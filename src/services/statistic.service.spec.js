const mocksHttp = require('node-mocks-http')
const assert = require('assert')
const sinon = require('sinon')
const StatisticService = require('./statistic.service')
const config = require('../config')

describe('./services/statistic.service.js', () => {
  const req = mocksHttp.createRequest()

  it('receive overview', (done) => {
    (async() => {
      const result = await new StatisticService(req).overview()
      assert.equal(result.everHosts, 1)
      assert.equal(result.everDomains, 1)
      assert.equal(result.periodHosts, 1)
      assert.equal(result.periodDomains, 1)
      done()
    })()
  })

  it('should return overview error', (done) => {
    (async() => {
      const err = { code: 'ERRORCODE', message: 'error-message' }
      sinon.stub(Promise, 'all').returns(Promise.reject(err))
      try {
        await new StatisticService(req).overview('www.google.com')
      } catch (err) {
        assert.equal(err.code, 'ERRORCODE')
        assert.equal(err.message, 'error-message')
        Promise.all.restore()
        done()
      }
    })()
  })

  it('put information', (done) => {
    (async() => {
      const result = await new StatisticService(req).put('www.google.com')
      assert.equal(result, true)
      done()
    })()
  })

  it('should return put error', (done) => {
    (async() => {
      const err = { code: 'ERRORCODE', message: 'error-message' }
      sinon.stub(Promise, 'all').returns(Promise.reject(err))

      try {
        await new StatisticService(req).put('www.google.com')
      } catch (err) {
        assert.equal(err.code, 'ERRORCODE')
        assert.equal(err.message, 'error-message')
        Promise.all.restore()
        done()
      }
    })()
  })

  it('statistic disabled - put', (done) => {
    (async() => {
      config.activateCounter = 'false'
      const result = await new StatisticService(req).put('www.google.com')
      assert.equal(result, true)
      config.activateCounter = 'true'
      done()
    })()
  })

  it('statistic disabled - overview', (done) => {
    (async() => {
      config.activateCounter = 'false'
      const result = new StatisticService(req).overview('www.google.com')
      assert.deepEqual(result, {})
      config.activeCounter = 'true'
      done()
    })()
  })
})
