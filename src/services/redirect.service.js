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
      status: 301,
      port: 0
    }

    let labels = hostname.replace(`.${config.fqdn}`, '').split('.')

    let tok = true
    let query = true
    labels = labels.map(function(label) {
      let r
      let p
      const delim = tok ? '' : '.'
      tok = true
      switch (true) {
        case !!label.match(/^(opts-|_)uri$/): options.uri = true; return ''
        case !!label.match(/^(opts-|_)https$/): options.https = true; return ''
        case !!(r = label.match(/^(?:opts-|_)s(?:tatus)?c(?:ode)?-(\d+)$/)): options.status = parseInt(r[1]); return ''
        case !!(p = label.match(/^(?:opts-|_)p(?:or)?t-(\d+)$/)): options.port = parseInt(p[1]); return ''
        case !!label.match(/^(opts-|_)s(lash)?$/): return '/'
        case !!label.match(/^(opts-|_)q(uery)?$/): return (query && !(query = false)) ? '?' : '&'
        case !!label.match(/^(opts-|_)eq?$/): return '='
        case !!label.match(/^(opts-|_)p(er)?c(ent)?$/): return '%'
        case !!label.match(/^(opts-|_)p(lus)?$/): return '+'
        case !!label.match(/^(opts-|_)c(olon)?$/): return ':'
        case !!label.match(/^(opts-|_)h(ash)?$/): return '#'
        case !!label.match(/^(opts-|_)d(ot)?$/): return '.'
        default:
          tok = false
          return delim + label
      }
    })

    hostname = labels.join('')

    this.logger.info(`${path} ${hostname} without .opts`)

    let url
    try {
      url = new URL((options.https ? 'https' : 'http') + '://' + hostname)
    } catch (e) {
      return {
        protocol: (options.https ? 'https' : 'http'),
        hostname: hostname,
        path: '',
        statusCode: 500
      }
    }

    hostname = url.hostname + (options.port > 0 && options.port <= 65535 ? ':' + options.port : '')
    let urlPath = url.pathname + url.search + url.hash
    if (options.uri) urlPath += this.req.url.replace(/^\/+/, '')

    this.logger.info(`${path} ${hostname} final`)

    return {
      protocol: (options.https ? 'https' : 'http'),
      hostname: hostname,
      path: urlPath,
      statusCode: (options.status >= 300 && options.status <= 399 ? options.status : 301)
    }
  }
}
