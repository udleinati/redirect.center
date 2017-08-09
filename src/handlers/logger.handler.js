const config = require('../config')
const winston = require('winston')

// logger handler
module.exports = class LoggerHandler {
  constructor() {
    if (!global.logger) {
      global.logger = new (winston.Logger)({
        level: config.loggerLevel,
        transports: [
          new (winston.transports.Console)({ colorize: true })
        ]
      })
    }

    this.logger = global.logger
  }

  info(message, parameters) {
    this.logger.info(message, parameters)
  }

  error(message, parameters) {
    this.logger.error(message, parameters)
  }

  warn(message, parameters) {
    this.logger.warn(message, parameters)
  }

  debug(message, parameters) {
    this.logger.debug(message, parameters)
  }
}
