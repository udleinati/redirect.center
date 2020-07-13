const dns = require('dns')
const { parseDomain, ParseResultType } = require('parse-domain')

const config = require('../config')
const RedirectService = require('../services/redirect.service')
const StatisticService = require('../services/statistic.service')
const LoggerHandler = require('../handlers/logger.handler')

/* Router callback */
module.exports = (req, res) => {
  const logger = new LoggerHandler()

  let targetHost = req.headers.host.split(':')[0]

  const path = `${req.requestId} ${targetHost}`
  logger.info(path)

  /* dns.resolve callback */
  const callback = (err, records) => {
    logger.info(`${path} -> CNAME ${targetHost}`)

    /* handle errors */
    if (err && err.code === 'ENODATA' &&
      [ParseResultType.Reserved, ParseResultType.Listed, ParseResultType.NotListed].includes(parseDomain(targetHost).type) &&
      parseDomain(targetHost).subDomains.indexOf('redirect') < 0) {
      targetHost = `redirect.${targetHost}`
      logger.info(`${path} -> CNAME pointing to redirect!`)
      return dns.resolve(targetHost, 'CNAME', callback)
    }

    if (!err && records.length > 1) {
      err = {
        code: 'MORETHANONE',
        message: `More than one record on the host ${targetHost}. Found: ${records.join(', ')}`
      }
    }

    if (!err && ![ParseResultType.Reserved, ParseResultType.Listed, ParseResultType.NotListed].includes(parseDomain(records[0]).type)) {
      err = {
        code: 'NOTADOMAIN',
        message: `The record on the host ${targetHost} is not valid. Found: ${records[0]}`
      }
    }

    if (err) {
      logger.info(`${path} ERROR: ${err.message}`)

      return res.status(500).render('error.ejs', {
        config: config,
        err: err,
        targetHost: targetHost
      })
    }

    /* prepar to redirect */
    const returns = new RedirectService(req).perform(records[0])
    new StatisticService(req).put(targetHost)

    /* perform redirect */
    const url = `${returns.protocol}://${returns.hostname}${returns.path}`
    logger.info(`${path} REDIRECT ${returns.statusCode} TO ${url}`)

    /* Helping Garbage Collection */
    targetHost = null

    /* Redirecting */
    return res.redirect(returns.statusCode, url)
  }

  dns.resolve(targetHost, 'CNAME', callback)
}
