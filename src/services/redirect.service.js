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
      slashs: [],
      status: 301,
      queries: [],
    }

    let r

    hostname = hostname.replace(`.${config.fqdn}`, '')

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

    while ((r = hostname.match(/(\.(?:opts-query)\.)(.*?)(?:(?:\.(?:opts-eq|eq)\.?)(.*?))?(?:(?:\.|$))/))) {
      hostname = hostname.replace(r[0], '')
      if (r[3]) {
        options.queries.push(`${r[2]}=${r[3]}`)
      } else {
        options.queries.push(`${r[2]}`)
      }
      this.logger.info(`${path} ${hostname} without ${r[0]}`)
    }

    while ((r = hostname.match(/(\.(?:opts-slash)\.)(.*?)(?:(?:\.(?:opts-slash|slash)\.?)|$)/))) {
      hostname = hostname.replace(`.opts-slash.${r[2]}`, '')
      options.slashs.push(r[2])
      this.logger.info(`${path} ${hostname} without .opts-slash.${r[2]}`)
    }

    while ((r = hostname.match(/(\.(?:slash)\.)(.*?)(?:(?:\.(?:slash)\.)|$)/))) {
      hostname = hostname.replace(`.slash.${r[2]}`, '')
      options.slashs.push(r[2])
      this.logger.info(`${path} ${hostname} without .slash.${r[2]}`)
    }


    if ((r = hostname.match(/.opts-slash/))) {
      hostname = hostname.replace('.opts-slash', '')
      options.slashs.push('')
      this.logger.info(`${path} ${hostname} add final slash`)
    }

    this.logger.info(`${path} ${hostname} final`)

    let urlPath = ''
    if (options.slashs.length >= 1) urlPath += `/${options.slashs.join('/')}`
    if (options.queries.length >= 1) urlPath += `?${options.queries.join('&')}`
    if (options.uri === true) urlPath += this.req.url

    return {
      protocol: ((options.https === true) ? 'https' : 'http'),
      hostname: hostname,
      path: urlPath,
      statusCode: options.status
    }
  }
}
