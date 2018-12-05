const mocksHttp = require('node-mocks-http')
const assert = require('assert')
const sinon = require('sinon')
const StatisticService = require('./statistic.service')
const config = require('../config')

describe('./services/statistic.service.js', () => {
  const req = mocksHttp.createRequest()

  it('receive overview', async () => {
    const result = await new StatisticService(req).overview()
    assert.equal(result.everDomains, 1)
    assert.equal(result.periodHosts, 1)
    assert.equal(result.periodDomains, 1)
  })

  it('should return overview error', async () => {
    const err = {
      code: 'ERRORCODE',
      message: 'error-message'
    }
    sinon.stub(Promise, 'all').returns(Promise.reject(err))
    try {
      await new StatisticService(req).overview('www.google.com')
      throw new Error('never')
    } catch (err) {
      assert.equal(err.code, 'ERRORCODE')
      assert.equal(err.message, 'error-message')
      Promise.all.restore()
    }
  })

  it('put information', async () => {
    const result = await new StatisticService(req).put('www.google.com')
    assert.equal(result, true)
  })

  it('should return put error', async () => {
    const err = {
      code: 'ERRORCODE',
      message: 'error-message'
    }
    sinon.stub(Promise, 'all').returns(Promise.reject(err))

    try {
      await new StatisticService(req).put('www.google.com')
      throw new Error('never')
    } catch (err) {
      assert.equal(err.code, 'ERRORCODE')
      assert.equal(err.message, 'error-message')
      Promise.all.restore()
    }
  })

  it('statistic disabled - put', async () => {
    config.activateCounter = 'false'
    const result = await new StatisticService(req).put('www.google.com')
    assert.equal(result, true)
    config.activateCounter = 'true'
  })

  it('statistic disabled - overview', async () => {
    config.activateCounter = 'false'
    const result = new StatisticService(req).overview('www.google.com')
    assert.deepEqual(result, {})
    config.activeCounter = 'true'
  })
})
