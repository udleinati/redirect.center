import sinon from 'sinon'
import LoggerHandler from '../handlers/logger.handler'
import redis from 'redis'

before(() => {
  sinon.stub(LoggerHandler.prototype, 'info')
  sinon.stub(redis, 'createClient').returns({
    send_commandAsync: () => { return 1 },
    setAsync: () => { return 'OK' }
  })
})

after(() => {
  LoggerHandler.prototype.info.restore()
})
