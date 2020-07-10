const config = require('../config')
const LoggerHandler = require('../handlers/logger.handler')

module.exports = class RedirectService {
  constructor(req) {
    this.req = req
    this.logger = new LoggerHandler()
    this.path = `${this.req.requestId} RedirectService`
    this.logger.info(`${this.path} constructor`)
  }

  perform(hostname) {
    const path = `${this.path} perform`
    this.logger.info(`${path} ${hostname}`)

    const options = {
      uri: false,
      https: false,
      status: 301
    }

    let r

    hostname = hostname.replace(`.${config.fqdn}`, '')
      .replace(/\.?opts-slash\.?/g, '/')
      .replace(/\.?opts-query\.?/, '?')
      .replace(/\.?opts-query\.?/g, '&')
      .replace(/\.?opts-eq\.?/g, '=')
      .replace(/\.?opts-plus\.?/g, '+')
      .replace(/\.?opts-percent\.?/g, '%')
      .replace(/\.?opts-hash\.?/g, '#')
      .replace(/\.?opts-dot\.?/g, '.')

    if (hostname.indexOf('.opts-uri') >= 0) {
      hostname = hostname.replace('.opts-uri', '')
      options.uri = true
      this.logger.info(`${path} ${hostname} without .opts-uri`)
    }

    if (hostname.indexOf('.opts-https') >= 0) {
      hostname = hostname.replace('.opts-https', '')
      options.https = true
      this.logger.info(`${path} ${hostname} without .opts-https`)
    }

    if ((r = hostname.match(/.opts-statuscode-(\d+)/))) {
      hostname = hostname.replace(`.opts-statuscode-${r[1]}`, '')
      if ((parseInt(r[1]) >= 300 && parseInt(r[1]) <= 399)) options.status = parseInt(r[1])
      this.logger.info(`${path} ${hostname} without .opts-statuscode-${r[1]}`)
    }

    this.logger.info(`${path} ${hostname} final`)

    let urlPath = ''
    if (hostname.indexOf('/') >= 0) {
      urlPath = hostname.substring(hostname.indexOf('/'))
      hostname = hostname.substring(0, hostname.indexOf('/'))
    }
    if (options.uri === true) urlPath += this.req.url

    return {
      protocol: ((options.https === true) ? 'https' : 'http'),
      hostname: hostname,
      path: urlPath,
      statusCode: options.status
    }
  }
}
