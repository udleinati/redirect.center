const bunyan = require('bunyan')
const config = require('../config')

// logger handler
module.exports = class LoggerHandler {
  constructor() {
    if (!global.logger) {
      global.logger = bunyan.createLogger({
        name: config.projectName.toLowerCase(),
        level: config.loggerLevel
      })
    }

    this.logger = global.logger
  }

  info(message, parameters) {
    let params = null
    if (params) params = { params: parameters }
    this.logger.info(params, message)
  }

  error(message, parameters) {
    let params = null
    if (params) params = { params: parameters }
    this.logger.error(params, message)
  }

  warn(message, parameters) {
    let params = null
    if (params) params = { params: parameters }
    this.logger.warn(params, message)
  }

  debug(message, parameters) {
    let params = null
    if (params) params = { params: parameters }
    this.logger.debug(params, message)
  }
}
