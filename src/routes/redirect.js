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
    const path = `Host ${host}`
    logger.info(path)

    if (parseDomain(host) && !parseDomain(host).subdomain) {
      logger.info(`${path} A:ROOT DOMAIN`)
      targetHost = `redirect.${host}`
    }

    dns.resolve(targetHost, 'CNAME', (err, records) => {
      logger.info(`Host ${targetHost} resolve CNAME`)

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
        const context = {
          config: config,
          err: err,
          targetHost: targetHost
        }

        return res.status(500).render('error.ejs', context)
      }

      const redirectService = new RedirectService(req, res)
      redirectService.perform(records[0]).then((returns) => {
        const url = `${returns.protocol}://${returns.hostname}/${returns.path}`
        logger.info(`${path} redirect ${returns.statusCode} to ${url}`)
        return res.redirect(returns.statusCode, url)
      })
    })
  })

  return router
}
