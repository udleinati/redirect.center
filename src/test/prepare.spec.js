import sinon from 'sinon'
import LoggerHandler from '../handlers/logger.handler'
import redis from 'redis'

before(() => {
  sinon.stub(LoggerHandler.prototype, 'info')
  sinon.stub(LoggerHandler.prototype, 'warn')
  sinon.stub(LoggerHandler.prototype, 'error')
  sinon.stub(LoggerHandler.prototype, 'debug')
  sinon.stub(redis, 'createClient').returns({
    send_commandAsync: () => { return 1 },
    setAsync: () => { return 'OK' }
  })
})

after(() => {
  LoggerHandler.prototype.info.restore()
  LoggerHandler.prototype.warn.restore()
  LoggerHandler.prototype.error.restore()
  LoggerHandler.prototype.debug.restore()
  redis.createClient.restore()
})
