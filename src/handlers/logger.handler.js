import config from '../config'

var winston = require('winston')

if (!global.logger) {
  global.logger = new (winston.Logger)({
    level: config.loggerLevel,
    transports: [
      new (winston.transports.Console)({ colorize: true })
    ]
  })
}

// logger handler
export default class LoggerHandler {

  static info (message, parameters) {
    global.logger.info(message, parameters)
  }

  static error (message, parameters) {
    global.logger.error(message, parameters)
  }

  static warn (message, parameters) {
    global.logger.warn(message, parameters)
  }

  static debug (message, parameters) {
    global.logger.debug(message, parameters)
  }

}
