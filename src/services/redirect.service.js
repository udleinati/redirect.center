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

    if (hostname.match(/\.(opts-|_)uri/)) {
      hostname = hostname.replace(/\.(opts-|_)uri/g, '')
      options.uri = true
      this.logger.info(`${path} ${hostname} without .opts-uri`)
    }

    if (hostname.match(/\.(opts-|_)https/)) {
      hostname = hostname.replace(/\.(opts-|_)https/g, '')
      options.https = true
      this.logger.info(`${path} ${hostname} without .opts-https`)
    }

    if ((r = hostname.match(/\.(?:opts-|_)s(tatus)?c(ode)?-(\d+)/))) {
      hostname = hostname.replace(/\.(opts-|_)s(tatus)?c(ode)?-(\d+)/g, '')
      if ((parseInt(r[1]) >= 300 && parseInt(r[1]) <= 399)) options.status = parseInt(r[1])
      this.logger.info(`${path} ${hostname} without .opts-statuscode-${r[1]}`)
    }

    hostname = hostname.replace(`.${config.fqdn}`, '')
      .replace(/\.(opts-|_)s(lash)?(\.(?!(opts-|_)))?/g, '/')
      .replace(/\.(opts-|_)q(uery)?(\.(?!(opts-|_)))?/, '?')
      .replace(/\.(opts-|_)q(uery)?(\.(?!(opts-|_)))?/g, '&')
      .replace(/\.(opts-|_)eq(\.(?!(opts-|_)))?/g, '=')
      .replace(/\.(opts-|_)p(er)?c(ent)?(\.(?!(opts-|_)))?/g, '%')
      .replace(/\.(opts-|_)p(lus)?(\.(?!(opts-|_)))?/g, '+')
      .replace(/\.(opts-|_)c(olon)?(\.(?!(opts-|_)))?/g, ':')
      .replace(/\.(opts-|_)h(ash)?(\.(?!(opts-|_)))?/g, '#')
      .replace(/\.(opts-|_)d(ot)?\.?/g, '.')

    const url = new URL(((options.https === true) ? 'https' : 'http') + '://' + hostname)

    hostname = url.hostname
    let urlPath = url.pathname + url.search + url.hash
    if (options.uri === true) urlPath += this.req.url.replace(/^\/+/, '')

    this.logger.info(`${path} ${hostname} final`)

    return {
      protocol: ((options.https === true) ? 'https' : 'http'),
      hostname: hostname,
      path: urlPath,
      statusCode: options.status
    }
  }
}
