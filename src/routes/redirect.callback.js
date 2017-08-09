import dns from 'dns'
import parseDomain from 'parse-domain'

import config from '../config'
import RedirectService from '../services/redirect.service'
import StatisticService from '../services/statistic.service'
import LoggerHandler from '../handlers/logger.handler'

/* Router callback */
export default (req, res) => {
  const logger = new LoggerHandler()

  let targetHost = req.headers.host.split(':')[0]

  const path = `${req.requestId} ${targetHost}`
  logger.info(path)

  /* dns.resolve callback */
  const callback = (err, records) => {
    logger.info(`${path} -> CNAME ${targetHost}`)

    /* handle errors */
    if (err && err.code === 'ENODATA' && parseDomain(targetHost) &&
      parseDomain(targetHost).subdomain.indexOf('redirect') < 0) {
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

    if (!err && !parseDomain(records[0])) {
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
