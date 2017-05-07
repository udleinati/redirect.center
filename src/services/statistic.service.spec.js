import mocksHttp from 'node-mocks-http'
import assert from 'assert'
import StatisticService from './statistic.service'

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

  it('put information', (done) => {
    new StatisticService(req).put('www.google.com').then((result) => {
      assert.equal(result, true)
      done()
    })
  })
})
