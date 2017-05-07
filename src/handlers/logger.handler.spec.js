import sinon from 'sinon'
import LoggerHandler from '../handlers/logger.handler'

describe('./handlers/logger.handler.js', () => {
  before(() => {
    LoggerHandler.prototype.info.restore()
  })

  after(() => {
    sinon.stub(LoggerHandler.prototype, 'info')
  })

  it('info error warn debug', (done) => {
    const logger = new LoggerHandler()

    logger.info('info')
    logger.info('info', { param1: 'a', param2: 'b' })

    logger.error('error')
    logger.error('error', { param1: 'a', param2: 'b' })

    logger.warn('warn')
    logger.warn('warn', { param1: 'a', param2: 'b' })

    logger.debug('debug')
    logger.debug('debug', { param1: 'a', param2: 'b' })

    done()
  })
})
