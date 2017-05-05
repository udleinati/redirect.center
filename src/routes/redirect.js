import Router from 'express'
import dns from 'dns'
import parseDomain from 'parse-domain'

import config from '../config'
import RedirectService from '../services/redirect.service'
import LoggerHandler from '../handlers/logger.handler'

export default () => {
  const router = Router()
  const logger = LoggerHandler

  router.all('*', (req, res) => {
    let host = req.headers.host.split(':')[0]
    let targetHost = host
    let countCalls = 0

    const path = `${host}`
    logger.info(path)

    if (parseDomain(host) && !parseDomain(host).subdomain) {
      logger.info(`${path} A:ROOT DOMAIN`)
      targetHost = `redirect.${host}`
    }

    const callback = (err, records) => {
      console.log(err)
      logger.info(`${path} -> CNAME ${targetHost}`)
      countCalls += 1

      if (countCalls > 3) {
        return res.status(508).send('Loop Detected')
      }

      if (!err && records.length > 1) {
        err = {
          code: 'MORETHANONE',
          message: `More than one record on the host ${targetHost}. Found: ${records.join(', ')}`
        }
      }

      if (!err && !parseDomain(records[0]) && records[0] === config.publicIP) {
        const parse = parseDomain(records[0])
        targetHost = `redirect.${parse.domain}.${parse.tld}`
        logger.info(`${path} CNAME pointing to redirect!`)
        return dns.resolve(targetHost, 'CNAME', callback)
      } else if (!err && !parseDomain(records[0])) {
        err = {
          code: 'NOTADOMAIN',
          message: `The record on the host ${targetHost} is not valid. Found: ${records[0]}`
        }
      }

      if (err) {
        const context = {
          config: config,
          err: err,
          targetHost: targetHost
        }

        logger.info(`${path} ERROR: ${err.message}`)
        return res.status(500).render('error.ejs', context)
      }

      const redirectService = new RedirectService(req, res)
      redirectService.perform(records[0]).then((returns) => {
        const url = `${returns.protocol}://${returns.hostname}${returns.path}`
        logger.info(`${path} REDIRECT ${returns.statusCode} TO ${url}`)
        return res.redirect(returns.statusCode, url)
      })
    }

    dns.resolve(targetHost, 'CNAME', callback)
  })

  return router
}
